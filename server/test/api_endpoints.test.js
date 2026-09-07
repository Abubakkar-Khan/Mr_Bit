import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { initializeDatabase } from '../src/config/database.js';

describe('API Endpoints Integration (Mocha/Chai/Supertest)', () => {
  before(() => {
    initializeDatabase();
  });

  describe('GET /api', () => {
    it('should return welcome message', async () => {
      const res = await request(app).get('/api');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('message');
      expect(res.body.message).to.include('Mr. Bit API');
    });
  });

  describe('Settings API (/api/settings)', () => {
    it('should fetch system settings', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('min_saves');
      expect(res.body).to.have.property('max_dimension');
      expect(res.body).to.have.property('min_sharpness');
    });

    it('should update settings including dimension bounds and queries', async () => {
      const updatePayload = {
        automation_enabled: 1,
        posting_time: '14:00',
        posts_per_day: 2,
        pinterest_queries: JSON.stringify(['cyberpunk art', 'retro anime']),
        min_saves: 75,
        min_dimension: 700,
        max_dimension: 2048,
        min_sharpness: 25.0,
        min_aesthetic_score: 6.0,
        predefined_caption: 'Updated test caption #MrBit'
      };

      const res = await request(app).put('/api/settings').send(updatePayload);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('message');

      const getRes = await request(app).get('/api/settings');
      expect(getRes.body.posts_per_day).to.equal(2);
      expect(getRes.body.min_saves).to.equal(75);
      expect(getRes.body.min_sharpness).to.equal(25.0);
    });
  });

  describe('Debug Candidates API (/api/images/debug/candidates)', () => {
    it('should return candidate records with filter stage and scores', async () => {
      const res = await request(app).get('/api/images/debug/candidates?limit=20');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      if (res.body.length > 0) {
        const item = res.body[0];
        expect(item).to.have.property('source_name');
        expect(item).to.have.property('filter_stage');
        expect(item).to.have.property('opencv_sharpness');
        expect(item).to.have.property('onnx_aesthetic_score');
      }
    });

    it('should support stage filtering query parameter', async () => {
      const res = await request(app).get('/api/images/debug/candidates?stage=passed_all_stages');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      res.body.forEach(c => {
        expect(c.filter_stage).to.equal('passed_all_stages');
      });
    });
  });

  describe('Diagnostic Logs API (/api/logs)', () => {
    it('should retrieve structured logs with status and metadata', async () => {
      const res = await request(app).get('/api/logs?limit=50');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      if (res.body.length > 0) {
        expect(res.body[0]).to.have.property('stage');
        expect(res.body[0]).to.have.property('level');
        expect(res.body[0]).to.have.property('message');
      }
    });

    it('should return active run status at /api/logs/status', async () => {
      const res = await request(app).get('/api/logs/status');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('currentPipelineStage');
    });
  });

  describe('Posts API (/api/posts/today)', () => {
    it('should return the latest post or null', async () => {
      const res = await request(app).get('/api/posts/today');
      expect(res.status).to.equal(200);
      if (res.body) {
        expect(res.body).to.have.property('image_url');
        expect(res.body).to.have.property('ascii_output_path');
      }
    });
  });
});
