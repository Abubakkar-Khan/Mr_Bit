import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../../config/database.js';
import * as imagesService from '../images/images.service.js';
import * as asciiService from '../ascii/ascii.service.js';
import * as postsService from '../posts/posts.service.js';
import { logger, LogStage, setActiveRun, setPipelineStage } from '../logger/logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cronJob = null;
let isRunning = false;
let lastRun = null;

export async function runFullPipeline(customRunId = null) {
  if (isRunning) {
    throw new Error('Pipeline is already running');
  }

  const runId = customRunId || `pipe_${Date.now()}`;
  isRunning = true;
  lastRun = new Date();
  setActiveRun(runId, LogStage.PIPELINE);
  
  try {
    logger.info(LogStage.PIPELINE, `Starting full Mr. Bit Pinterest Pipeline [Run ID: ${runId}]`, null, runId);
    
    // 1. Fetch & Score Images across 3 Tiers
    await imagesService.fetchAndScoreCandidates({ runId });
    
    // 2. Read settings for posts per day
    const settingsStmt = db.prepare('SELECT automation_enabled, predefined_caption, posts_per_day FROM settings WHERE id = 1');
    const settings = settingsStmt.get() || {};
    const postsCount = Math.max(1, Number(settings.posts_per_day) || 1);

    // 3. Select Top Candidates for posting
    const bestCandidates = imagesService.selectTopCandidates(postsCount);
    if (bestCandidates.length === 0) {
      logger.warn(LogStage.PIPELINE, 'No qualified candidates found today after 3-tier filtering.', null, runId);
      isRunning = false;
      setActiveRun(null, 'IDLE');
      return { success: false, message: 'No suitable candidates qualified after 3-tier filtering' };
    }
    
    logger.info(LogStage.PIPELINE, `Selected top ${bestCandidates.length} candidate(s) for posting (target: ${postsCount}/day).`, null, runId);

    const axios = (await import('axios')).default;
    const postsRepo = await import('../posts/posts.repository.js');

    // Process each selected candidate
    for (const candidate of bestCandidates) {
      setPipelineStage(LogStage.DITHER);
      logger.info(LogStage.DITHER, `Rendering 1-bit retro art for [#${candidate.id}] "${candidate.title.substring(0, 30)}..."`, null, runId);

      const response = await axios.get(candidate.image_url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      const asciiOutputPath = await asciiService.convertToDitheredImage(buffer);
      logger.info(LogStage.DITHER, `Generated retro CRT dither output: ${asciiOutputPath}`, null, runId);

      // Post to Facebook (if automation enabled)
      setPipelineStage(LogStage.PUBLISH);
      if (settings.automation_enabled === 1) {
        logger.info(LogStage.PUBLISH, `Auto-publishing candidate #${candidate.id} to Facebook...`, null, runId);
        try {
          await postsService.createAndPublishPost(candidate, asciiOutputPath, settings.predefined_caption || candidate.title);
          logger.info(LogStage.PUBLISH, `Published post for candidate #${candidate.id} successfully.`, null, runId);
        } catch (publishErr) {
          logger.error(LogStage.PUBLISH, `Facebook publish failed: ${publishErr.message}`, null, runId);
        }
      } else {
        logger.info(LogStage.PUBLISH, `Automation disabled. Saved candidate #${candidate.id} as pending queue post.`, null, runId);
        postsRepo.createPostRecord({
          candidate_id: candidate.id,
          image_url: candidate.image_url,
          ascii_output_path: asciiOutputPath,
          caption: settings.predefined_caption || candidate.title,
          status: 'pending'
        });
      }
    }

    // 4. Cleanup old temp files
    cleanupTempFiles();
    
    logger.info(LogStage.PIPELINE, `All pipeline tasks completed successfully for [Run ID: ${runId}].`, null, runId);
    isRunning = false;
    setActiveRun(null, 'IDLE');
    return { success: true, message: 'Pipeline completed successfully', candidatesProcessed: bestCandidates.length };
    
  } catch (error) {
    logger.error(LogStage.PIPELINE, `Pipeline execution failed: ${error.message}`, error.stack, runId);
    isRunning = false;
    setActiveRun(null, 'IDLE');
    throw error;
  }
}

function cleanupTempFiles() {
  const tempDir = path.join(__dirname, '../../../data/temp-images');
  if (!fs.existsSync(tempDir)) return;
  
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  for (const file of files) {
    const filePath = path.join(tempDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > ONE_DAY) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    } catch {
      // Ignore stat error
    }
  }
  if (deletedCount > 0) {
    logger.debug(LogStage.PIPELINE, `Cleaned up ${deletedCount} temporary images older than 24 hours.`);
  }
}

export function startCronJob() {
  if (cronJob) cronJob.stop();
  
  const settingsStmt = db.prepare('SELECT automation_enabled, posting_time, posts_per_day FROM settings WHERE id = 1');
  const settings = settingsStmt.get() || {};
  
  if (settings.automation_enabled === 0) {
    logger.info(LogStage.PIPELINE, 'Automation master switch is disabled. Cron daemon idle.');
    return;
  }
  
  const [hour, minute] = (settings.posting_time || '10:00').split(':');
  const postsPerDay = Math.max(1, Number(settings.posts_per_day) || 1);

  let cronExpression;
  if (postsPerDay === 1) {
    cronExpression = `${minute} ${hour} * * *`;
  } else {
    // Spread across daytime hours (e.g. every X hours between 08:00 and 22:00)
    const intervalHours = Math.max(1, Math.floor(14 / postsPerDay));
    cronExpression = `${minute} 8-22/${intervalHours} * * *`;
  }
  
  logger.info(LogStage.PIPELINE, `Configured cron scheduler: "${cronExpression}" for ${postsPerDay} post(s)/day.`);
  cronJob = cron.schedule(cronExpression, async () => {
    try {
      await runFullPipeline();
    } catch (e) {
      logger.error(LogStage.PIPELINE, `Scheduled cron pipeline run failed: ${e.message}`);
    }
  });
}

export function getStatus() {
  return {
    isRunning,
    lastRun,
    nextRun: cronJob ? 'Active Scheduled' : 'Disabled',
    automationEnabled: cronJob !== null
  };
}
