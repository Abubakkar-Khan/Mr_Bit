import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../../config/database.js';
import * as imagesService from '../images/images.service.js';
import * as asciiService from '../ascii/ascii.service.js';
import * as postsService from '../posts/posts.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cronJob = null;
let isRunning = false;
let lastRun = null;

export async function runFullPipeline() {
  if (isRunning) {
    throw new Error('Pipeline is already running');
  }

  isRunning = true;
  lastRun = new Date();
  
  try {
    console.log(`[${new Date().toISOString()}] Starting full ASCII Man pipeline...`);
    
    // 1. Fetch & Score Images
    await imagesService.fetchAndScoreCandidates();
    
    // 2. Select Best Candidate
    const bestCandidate = imagesService.selectBestCandidate();
    if (!bestCandidate) {
      console.log('No suitable candidates found today.');
      isRunning = false;
      return { success: false, message: 'No suitable candidates found' };
    }
    
    console.log(`Selected best candidate: ${bestCandidate.title} (Score: ${bestCandidate.quality_score})`);

    // 3. Convert to Dithered Image
    const axios = (await import('axios')).default;
    const response = await axios.get(bestCandidate.image_url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const asciiOutputPath = await asciiService.convertToDitheredImage(buffer);
    
    console.log(`Retro image generated at ${asciiOutputPath}`);

    // 4. Post to Facebook (if automation enabled)
    const settingsStmt = db.prepare('SELECT automation_enabled, predefined_caption FROM settings WHERE id = 1');
    const settings = settingsStmt.get();
    
    if (settings.automation_enabled === 1) {
      console.log('Automation enabled, posting to Facebook...');
      await postsService.createAndPublishPost(bestCandidate, asciiOutputPath, settings.predefined_caption);
    } else {
      console.log('Automation disabled, saving post as pending...');
      const postsRepo = await import('../posts/posts.repository.js');
      postsRepo.createPostRecord({
        candidate_id: bestCandidate.id,
        image_url: bestCandidate.image_url,
        ascii_output_path: asciiOutputPath,
        caption: settings.predefined_caption,
        status: 'pending'
      });
    }

    // 5. Cleanup old temp files
    cleanupTempFiles();
    
    console.log(`[${new Date().toISOString()}] Pipeline completed successfully.`);
    isRunning = false;
    return { success: true, message: 'Pipeline completed successfully' };
    
  } catch (error) {
    console.error('Pipeline failed:', error);
    isRunning = false;
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
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > ONE_DAY) {
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }
  console.log(`Cleaned up ${deletedCount} temporary images older than 24 hours.`);
}

export function startCronJob() {
  if (cronJob) cronJob.stop();
  
  const settingsStmt = db.prepare('SELECT automation_enabled, posting_time FROM settings WHERE id = 1');
  const settings = settingsStmt.get();
  
  if (settings.automation_enabled === 0) {
    console.log('Automation is disabled, cron job not started.');
    return;
  }
  
  const [hour, minute] = (settings.posting_time || '10:00').split(':');
  
  // Format: "minute hour * * *"
  const cronExpression = `${minute} ${hour} * * *`;
  
  console.log(`Starting cron job for ${cronExpression}`);
  cronJob = cron.schedule(cronExpression, async () => {
    try {
      await runFullPipeline();
    } catch (e) {
      console.error('Scheduled pipeline run failed:', e);
    }
  });
}

export function getStatus() {
  return {
    isRunning,
    lastRun,
    nextRun: cronJob ? 'Scheduled (Check cron expression)' : null, // node-cron doesn't expose next date easily
    automationEnabled: cronJob !== null
  };
}
