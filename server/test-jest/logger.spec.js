import { initializeDatabase } from '../src/config/database.js';
import { logger, LogStage, LogLevel, getRecentLogs, clearLogs, setActiveRun } from '../src/modules/logger/logger.service.js';

describe('Logger Module (Jest Suite)', () => {
  beforeAll(() => {
    initializeDatabase();
    clearLogs();
  });

  test('should insert and retrieve structured pipeline logs', () => {
    const runId = 'jest_run_1';
    setActiveRun(runId, LogStage.PIPELINE);

    logger.info(LogStage.PIPELINE, 'Jest structured log test', { framework: 'jest' }, runId);

    const logs = getRecentLogs(5, { runId });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].message).toBe('Jest structured log test');
    expect(logs[0].stage).toBe(LogStage.PIPELINE);
    expect(logs[0].level).toBe(LogLevel.INFO);
  });

  test('should handle different severity levels (WARN, ERROR, DEBUG)', () => {
    const runId = 'jest_run_2';
    logger.warn(LogStage.STAGE_2_OPENCV, 'OpenCV warning', null, runId);
    logger.error(LogStage.STAGE_3_ONNX, 'ONNX error', null, runId);

    const warnLogs = getRecentLogs(5, { runId, level: LogLevel.WARN });
    expect(warnLogs.length).toBe(1);
    expect(warnLogs[0].message).toBe('OpenCV warning');

    const errorLogs = getRecentLogs(5, { runId, level: LogLevel.ERROR });
    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0].message).toBe('ONNX error');
  });
});
