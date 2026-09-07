import db from '../../config/database.js';

let activeRunId = null;
let currentPipelineStage = 'IDLE';

export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

export const LogStage = {
  INIT: 'INIT',
  SCRAPE: 'SCRAPE',
  STAGE_1_ENGAGEMENT: 'STAGE_1_ENGAGEMENT',
  STAGE_2_OPENCV: 'STAGE_2_OPENCV',
  STAGE_3_ONNX: 'STAGE_3_ONNX',
  DITHER: 'DITHER',
  PUBLISH: 'PUBLISH',
  PIPELINE: 'PIPELINE'
};

export function setActiveRun(runId, stage = 'INIT') {
  activeRunId = runId;
  currentPipelineStage = stage;
}

export function setPipelineStage(stage) {
  currentPipelineStage = stage;
}

export function getActiveRun() {
  return { activeRunId, currentPipelineStage };
}

export function log(level, stage, message, metadata = null, runId = null) {
  const currentRun = runId || activeRunId || 'system';
  const metaString = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

  try {
    const stmt = db.prepare(`
      INSERT INTO pipeline_logs (run_id, stage, level, message, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(currentRun, stage || currentPipelineStage, level, message, metaString);
  } catch (err) {
    console.error('Logger DB insert error:', err.message);
  }

  // Console formatting
  const ts = new Date().toISOString().substring(11, 19);
  const prefix = `[${ts}] [${level.padEnd(5)}] [${stage || 'GENERAL'}]`;
  if (level === LogLevel.ERROR) {
    console.error(`${prefix} ${message}`, metadata || '');
  } else if (level === LogLevel.WARN) {
    console.warn(`${prefix} ${message}`, metadata || '');
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  info: (stage, message, metadata, runId) => log(LogLevel.INFO, stage, message, metadata, runId),
  debug: (stage, message, metadata, runId) => log(LogLevel.DEBUG, stage, message, metadata, runId),
  warn: (stage, message, metadata, runId) => log(LogLevel.WARN, stage, message, metadata, runId),
  error: (stage, message, metadata, runId) => log(LogLevel.ERROR, stage, message, metadata, runId),
};

export function getRecentLogs(limit = 100, options = {}) {
  const { stage, level, runId } = options;
  let sql = 'SELECT * FROM pipeline_logs WHERE 1=1';
  const params = [];

  if (stage) {
    sql += ' AND stage = ?';
    params.push(stage);
  }
  if (level) {
    sql += ' AND level = ?';
    params.push(level);
  }
  if (runId) {
    sql += ' AND run_id = ?';
    params.push(runId);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error('getRecentLogs error:', err.message);
    return [];
  }
}

export function clearLogs() {
  try {
    db.prepare('DELETE FROM pipeline_logs').run();
    return true;
  } catch (err) {
    console.error('clearLogs error:', err.message);
    return false;
  }
}

export default logger;
