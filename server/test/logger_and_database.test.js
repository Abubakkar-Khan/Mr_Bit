import { expect } from 'chai';
import db, { initializeDatabase } from '../src/config/database.js';
import { logger, LogStage, LogLevel, getRecentLogs, clearLogs, setActiveRun } from '../src/modules/logger/logger.service.js';
import * as imagesRepo from '../src/modules/images/images.repository.js';
import * as postsRepo from '../src/modules/posts/posts.repository.js';

describe('Database & Logger Services (Mocha/Chai)', () => {
  before(() => {
    initializeDatabase();
    clearLogs();
  });

  describe('Logger Service', () => {
    it('should log INFO messages to SQLite pipeline_logs', () => {
      const runId = 'mocha_test_run_1';
      setActiveRun(runId, LogStage.SCRAPE);

      logger.info(LogStage.SCRAPE, 'Testing Mocha info logging', { testKey: 'val' }, runId);

      const logs = getRecentLogs(10, { runId, level: LogLevel.INFO });
      expect(logs).to.be.an('array');
      expect(logs.length).to.be.at.least(1);

      const entry = logs[0];
      expect(entry.run_id).to.equal(runId);
      expect(entry.stage).to.equal(LogStage.SCRAPE);
      expect(entry.message).to.equal('Testing Mocha info logging');
      expect(entry.level).to.equal(LogLevel.INFO);
      expect(entry.metadata).to.include('testKey');
    });

    it('should correctly filter logs by level and stage', () => {
      const runId = 'mocha_test_run_2';
      logger.warn(LogStage.STAGE_1_ENGAGEMENT, 'Warning message', null, runId);
      logger.error(LogStage.STAGE_3_ONNX, 'Error message', null, runId);

      const warnLogs = getRecentLogs(10, { runId, level: LogLevel.WARN });
      expect(warnLogs.length).to.equal(1);
      expect(warnLogs[0].stage).to.equal(LogStage.STAGE_1_ENGAGEMENT);

      const errorLogs = getRecentLogs(10, { runId, level: LogLevel.ERROR });
      expect(errorLogs.length).to.equal(1);
      expect(errorLogs[0].stage).to.equal(LogStage.STAGE_3_ONNX);
    });
  });

  describe('Images & Posts Repository', () => {
    let testCandidateId;

    it('should insert a Pinterest candidate with dimensions and saves count', () => {
      const candidate = imagesRepo.saveCandidate({
        image_url: 'https://i.pinimg.com/test_image_mocha.jpg',
        source_name: 'pinterest',
        title: 'Mocha Test Digital Art',
        category: 'art',
        saves_count: 180,
        width: 1200,
        height: 1600,
        filter_stage: 'scraped',
        filter_reason: 'Discovered during mocha test'
      });

      expect(candidate).to.be.an('object');
      expect(candidate.id).to.be.a('number');
      testCandidateId = candidate.id;

      const retrieved = imagesRepo.getCandidateById(testCandidateId);
      expect(retrieved.title).to.equal('Mocha Test Digital Art');
      expect(retrieved.saves_count).to.equal(180);
      expect(retrieved.width).to.equal(1200);
      expect(retrieved.height).to.equal(1600);
    });

    it('should update multi-stage analysis data and score', () => {
      imagesRepo.updateCandidateAnalysis(testCandidateId, {
        opencv_sharpness: 42.5,
        opencv_contrast: 61.2,
        onnx_aesthetic_score: 9.4,
        quality_score: 92.0,
        filter_stage: 'passed_all_stages',
        filter_reason: 'Qualified all 3 gates in test'
      });

      const updated = imagesRepo.getCandidateById(testCandidateId);
      expect(updated.opencv_sharpness).to.equal(42.5);
      expect(updated.onnx_aesthetic_score).to.equal(9.4);
      expect(updated.quality_score).to.equal(92.0);
      expect(updated.filter_stage).to.equal('passed_all_stages');
    });

    it('should create and retrieve the latest post record', () => {
      const post = postsRepo.createPostRecord({
        candidate_id: testCandidateId,
        image_url: 'https://i.pinimg.com/test_image_mocha.jpg',
        ascii_output_path: '/outputs/retro_mocha_test.png',
        caption: 'Mocha Automated Creation',
        status: 'pending'
      });

      expect(post.id).to.be.a('number');

      const latest = postsRepo.getTodayPost();
      expect(latest).to.be.an('object');
      expect(latest.id).to.equal(post.id);
      expect(latest.ascii_output_path).to.equal('/outputs/retro_mocha_test.png');
    });
  });
});
