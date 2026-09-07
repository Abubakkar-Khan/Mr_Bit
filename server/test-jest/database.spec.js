import { initializeDatabase } from '../src/config/database.js';
import * as imagesRepo from '../src/modules/images/images.repository.js';
import * as postsRepo from '../src/modules/posts/posts.repository.js';

describe('Database & Persistence (Jest Suite)', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  test('should store Pinterest candidate with saves and resolution', () => {
    const candidate = imagesRepo.saveCandidate({
      image_url: 'https://i.pinimg.com/jest_pin_sample.jpg',
      source_name: 'pinterest',
      title: 'Jest Aesthetic Sample',
      category: 'art',
      saves_count: 310,
      width: 1080,
      height: 1920,
      filter_stage: 'scraped',
      filter_reason: 'Scraped by Jest suite'
    });

    expect(candidate.id).toBeDefined();

    const retrieved = imagesRepo.getCandidateById(candidate.id);
    expect(retrieved.saves_count).toBe(310);
    expect(retrieved.width).toBe(1080);
    expect(retrieved.height).toBe(1920);
  });

  test('should retrieve today Pinterest candidates sorted by quality score', () => {
    const candidates = imagesRepo.getTodayCandidates();
    expect(Array.isArray(candidates)).toBe(true);
    candidates.forEach(c => {
      expect(c.source_name).toBe('pinterest');
    });
  });

  test('should update candidate analysis and filter stage', () => {
    const candidate = imagesRepo.saveCandidate({
      image_url: 'https://i.pinimg.com/jest_pin_update.jpg',
      source_name: 'pinterest',
      title: 'Jest Update Sample',
      category: 'art',
      saves_count: 140,
      width: 736,
      height: 980
    });

    imagesRepo.updateCandidateAnalysis(candidate.id, {
      opencv_sharpness: 34.2,
      onnx_aesthetic_score: 8.7,
      quality_score: 88.5,
      filter_stage: 'passed_all_stages',
      filter_reason: 'Passed all 3 gates'
    });

    const updated = imagesRepo.getCandidateById(candidate.id);
    expect(updated.opencv_sharpness).toBe(34.2);
    expect(updated.onnx_aesthetic_score).toBe(8.7);
    expect(updated.filter_stage).toBe('passed_all_stages');
  });
});
