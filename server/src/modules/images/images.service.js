import axios from 'axios';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import db from '../../config/database.js';
import * as repo from './images.repository.js';
import { fetchPinterestTrendingArt } from './sources/pinterest.js';
import { computeOpenCvMetrics } from './opencv_metrics.service.js';
import { scoreAesthetic } from './onnx_aesthetic.service.js';
import { logger, LogStage, setActiveRun, setPipelineStage } from '../logger/logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, '../../../data/temp-images');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

function getSettings() {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  let pinterest_queries = ['digital art trending', 'concept art', 'cyberpunk landscape', 'retro anime aesthetic'];
  try {
    if (row.pinterest_queries) {
      pinterest_queries = JSON.parse(row.pinterest_queries);
    }
  } catch {
    // fallback default
  }

  return {
    pinterest_queries,
    min_saves: Number(row.min_saves) || 50,
    min_dimension: Number(row.min_dimension) || 600,
    max_dimension: Number(row.max_dimension) || 2048,
    min_sharpness: Number(row.min_sharpness) || 20.0,
    min_aesthetic_score: Number(row.min_aesthetic_score) || 5.0,
    posts_per_day: Number(row.posts_per_day) || 1
  };
}

export async function fetchAndScoreCandidates(options = {}) {
  const runId = options.runId || `run_${Date.now()}`;
  setActiveRun(runId, LogStage.SCRAPE);

  const settings = getSettings();
  logger.info(LogStage.PIPELINE, `Initiating Pinterest Discovery & 3-Tier Scoring Pipeline [Run: ${runId}]`, {
    min_saves: settings.min_saves,
    dimension_bounds: `${settings.min_dimension}px - ${settings.max_dimension}px`,
    min_sharpness: settings.min_sharpness,
    min_aesthetic: settings.min_aesthetic_score
  }, runId);

  // ==========================================
  // STAGE 0: PINTEREST HARVESTING
  // ==========================================
  setPipelineStage(LogStage.SCRAPE);
  const rawPins = await fetchPinterestTrendingArt(settings.pinterest_queries);
  logger.info(LogStage.SCRAPE, `Collected ${rawPins.length} raw pins from Pinterest.`, null, runId);

  if (rawPins.length === 0) {
    logger.warn(LogStage.SCRAPE, 'No pins harvested from Pinterest. Ensure network connectivity.', null, runId);
    return [];
  }

  const savedCandidates = [];
  for (const pin of rawPins) {
    if (!repo.isUrlAlreadyCandidate(pin.url)) {
      const saved = repo.saveCandidate({
        image_url: pin.url,
        source_name: 'pinterest',
        title: pin.title,
        category: pin.category || 'art',
        saves_count: pin.saves_count || 0,
        width: pin.width || 0,
        height: pin.height || 0,
        filter_stage: 'scraped',
        filter_reason: 'Harvested from Pinterest search'
      });
      savedCandidates.push(saved);
    }
  }

  logger.info(LogStage.SCRAPE, `Stored ${savedCandidates.length} new candidates into database. Starting 3-Tier Filter.`, null, runId);

  // ==========================================
  // STAGE 1: ENGAGEMENT & DIMENSION SAFETY GATE
  // ==========================================
  setPipelineStage(LogStage.STAGE_1_ENGAGEMENT);
  logger.info(LogStage.STAGE_1_ENGAGEMENT, `Evaluating Stage 1 (Min Saves: ${settings.min_saves}, Max Dim: ${settings.max_dimension}px)...`, null, runId);

  const stage1Passed = [];

  for (const candidate of savedCandidates) {
    const { id, saves_count, width, height, title } = candidate;

    // 1. Saves threshold check
    if (saves_count < settings.min_saves) {
      const reason = `Rejected: Low Pinterest saves (${saves_count} < ${settings.min_saves})`;
      repo.updateCandidateAnalysis(id, {
        filter_stage: 'rejected_stage_1',
        filter_reason: reason,
        status: 'rejected'
      });
      logger.debug(LogStage.STAGE_1_ENGAGEMENT, `[Pin #${id}] ${reason} - "${title.substring(0, 30)}..."`, null, runId);
      continue;
    }

    // 2. Maximum Dimension Check ("dont take very large images")
    if (width > settings.max_dimension || height > settings.max_dimension) {
      const reason = `Rejected: Oversized image (${width}x${height} > ${settings.max_dimension}px limit)`;
      repo.updateCandidateAnalysis(id, {
        filter_stage: 'rejected_stage_1',
        filter_reason: reason,
        status: 'rejected'
      });
      logger.debug(LogStage.STAGE_1_ENGAGEMENT, `[Pin #${id}] ${reason}`, null, runId);
      continue;
    }

    // 3. Minimum Dimension Check
    if ((width > 0 && width < settings.min_dimension) || (height > 0 && height < settings.min_dimension)) {
      const reason = `Rejected: Undersized thumbnail (${width}x${height} < ${settings.min_dimension}px)`;
      repo.updateCandidateAnalysis(id, {
        filter_stage: 'rejected_stage_1',
        filter_reason: reason,
        status: 'rejected'
      });
      logger.debug(LogStage.STAGE_1_ENGAGEMENT, `[Pin #${id}] ${reason}`, null, runId);
      continue;
    }

    repo.updateCandidateAnalysis(id, {
      filter_stage: 'stage_1_passed',
      filter_reason: `Qualified: ${saves_count} saves within ${settings.min_dimension}-${settings.max_dimension}px bounds`
    });
    stage1Passed.push(candidate);
  }

  logger.info(LogStage.STAGE_1_ENGAGEMENT, `Stage 1 complete. ${stage1Passed.length} / ${savedCandidates.length} pins passed engagement & dimension bounds.`, null, runId);

  // ==========================================
  // STAGE 2: OPENCV METRICS (SHARPNESS & CONTRAST)
  // ==========================================
  setPipelineStage(LogStage.STAGE_2_OPENCV);
  logger.info(LogStage.STAGE_2_OPENCV, `Evaluating Stage 2 OpenCV computer vision metrics (Min Laplacian: ${settings.min_sharpness})...`, null, runId);

  const stage2Passed = [];

  for (const candidate of stage1Passed) {
    const { id, image_url, title } = candidate;
    const thumbPath = path.join(tempDir, `thumb_${id}.jpg`);

    try {
      // Download buffer with strict timeout and maximum size limit (15MB)
      const response = await axios.get(image_url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 15 * 1024 * 1024
      });
      const buffer = Buffer.from(response.data);

      // Verify real image dimensions directly from file metadata
      const imageMeta = await sharp(buffer).metadata();
      const realWidth = imageMeta.width || candidate.width;
      const realHeight = imageMeta.height || candidate.height;

      // Secondary guard against oversized images
      if (realWidth > settings.max_dimension || realHeight > settings.max_dimension) {
        const reason = `Rejected: Actual file dimensions ${realWidth}x${realHeight} exceed ${settings.max_dimension}px limit`;
        repo.updateCandidateAnalysis(id, {
          filter_stage: 'rejected_stage_1',
          filter_reason: reason,
          width: realWidth,
          height: realHeight,
          status: 'rejected'
        });
        logger.debug(LogStage.STAGE_2_OPENCV, `[Pin #${id}] ${reason}`, null, runId);
        continue;
      }

      // Compute OpenCV Laplacian variance and colorfulness metrics
      const cv = await computeOpenCvMetrics(buffer);
      if (!cv.success) {
        throw new Error(cv.error || 'OpenCV metric calculation failed');
      }

      // Generate visual preview thumbnail for dashboard
      await sharp(buffer)
        .resize(400, 400, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);

      // Check Sharpness threshold
      if (cv.sharpness < settings.min_sharpness) {
        const reason = `Rejected: Blurry or low edge clarity (Laplacian ${cv.sharpness} < ${settings.min_sharpness})`;
        repo.updateCandidateAnalysis(id, {
          width: realWidth,
          height: realHeight,
          opencv_sharpness: cv.sharpness,
          opencv_contrast: cv.contrast,
          thumbnail_path: thumbPath,
          filter_stage: 'rejected_stage_2',
          filter_reason: reason,
          status: 'rejected'
        });
        logger.debug(LogStage.STAGE_2_OPENCV, `[Pin #${id}] ${reason}`, null, runId);
        continue;
      }

      repo.updateCandidateAnalysis(id, {
        width: realWidth,
        height: realHeight,
        opencv_sharpness: cv.sharpness,
        opencv_contrast: cv.contrast,
        thumbnail_path: thumbPath,
        filter_stage: 'stage_2_passed',
        filter_reason: `Qualified: Sharpness ${cv.sharpness} >= ${settings.min_sharpness}, Contrast ${cv.contrast}`
      });

      stage2Passed.push({
        ...candidate,
        buffer,
        realWidth,
        realHeight,
        cvMetrics: cv,
        thumbPath
      });
    } catch (err) {
      logger.warn(LogStage.STAGE_2_OPENCV, `[Pin #${id}] Failed image processing: ${err.message}`, null, runId);
      repo.updateCandidateAnalysis(id, {
        filter_stage: 'rejected_stage_2',
        filter_reason: `Download or processing error: ${err.message}`,
        status: 'rejected'
      });
    }
  }

  logger.info(LogStage.STAGE_2_OPENCV, `Stage 2 complete. ${stage2Passed.length} / ${stage1Passed.length} passed OpenCV sharpness check.`, null, runId);

  // ==========================================
  // STAGE 3: QUANTIZED ONNX AESTHETIC MODEL
  // ==========================================
  setPipelineStage(LogStage.STAGE_3_ONNX);
  logger.info(LogStage.STAGE_3_ONNX, `Evaluating Stage 3 Quantized Aesthetic Model (Min Score: ${settings.min_aesthetic_score}/10)...`, null, runId);

  const stage3Passed = [];

  for (const item of stage2Passed) {
    const { id, buffer, cvMetrics, saves_count, realWidth, realHeight, title } = item;

    const aesthetic = await scoreAesthetic(buffer, {
      sharpness: cvMetrics.sharpness,
      contrast: cvMetrics.contrast,
      colorfulness: cvMetrics.colorfulness
    });

    if (aesthetic.score < settings.min_aesthetic_score) {
      const reason = `Rejected: Aesthetic score ${aesthetic.score} < ${settings.min_aesthetic_score}`;
      repo.updateCandidateAnalysis(id, {
        onnx_aesthetic_score: aesthetic.score,
        filter_stage: 'rejected_stage_3',
        filter_reason: reason,
        status: 'rejected'
      });
      logger.debug(LogStage.STAGE_3_ONNX, `[Pin #${id}] ${reason} - "${title.substring(0, 30)}..."`, null, runId);
      continue;
    }

    // Calculate final composite quality score (0 - 100)
    // 70% Aesthetic Model + 20% OpenCV Sharpness/Contrast + 10% Pinterest Saves
    const aestheticComponent = aesthetic.score * 7; // up to 70
    const cvComponent = Math.min(20, (cvMetrics.sharpness * 0.15) + (cvMetrics.contrast * 0.1));
    const savesComponent = Math.min(10, Math.log10(Math.max(1, saves_count)) * 3.3);
    const finalScore = Math.min(100, Math.round((aestheticComponent + cvComponent + savesComponent) * 10) / 10);

    repo.updateCandidateAnalysis(id, {
      onnx_aesthetic_score: aesthetic.score,
      quality_score: finalScore,
      filter_stage: 'passed_all_stages',
      filter_reason: `Passed all 3 gates! Aesthetic: ${aesthetic.score}/10, Sharpness: ${cvMetrics.sharpness}, Saves: ${saves_count}`,
      status: 'candidate'
    });

    stage3Passed.push({
      ...item,
      aesthetic_score: aesthetic.score,
      final_score: finalScore
    });

    logger.info(LogStage.STAGE_3_ONNX, `🌟 [Pin #${id}] Qualified High-Quality Art! Score: ${finalScore}/100 (Aesthetic: ${aesthetic.score}/10) - "${title.substring(0, 35)}"`, null, runId);
  }

  logger.info(LogStage.PIPELINE, `🎉 Pipeline run completed! Scraped: ${rawPins.length} | Stg 1 (Saves/Dim): ${stage1Passed.length} | Stg 2 (OpenCV): ${stage2Passed.length} | Final Qualified Art: ${stage3Passed.length}`, null, runId);

  setPipelineStage('IDLE');
  return repo.getTodayCandidates();
}

export function selectBestCandidate() {
  const candidates = repo.getTodayCandidates().filter((c) => c.status === 'candidate');
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.quality_score - a.quality_score);
  const best = candidates[0];

  repo.updateCandidateStatus(best.id, 'selected');
  return best;
}

export function selectTopCandidates(count = 1) {
  const candidates = repo.getTodayCandidates().filter((c) => c.status === 'candidate');
  if (candidates.length === 0) return [];

  candidates.sort((a, b) => b.quality_score - a.quality_score);
  const selected = candidates.slice(0, count);

  for (const c of selected) {
    repo.updateCandidateStatus(c.id, 'selected');
  }

  return selected;
}
