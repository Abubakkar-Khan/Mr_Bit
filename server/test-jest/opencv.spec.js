import sharp from 'sharp';
import { computeOpenCvMetrics } from '../src/modules/images/opencv_metrics.service.js';

describe('OpenCV Vision Metrics (Jest Suite)', () => {
  test('should compute high Laplacian variance for sharp high-contrast images', async () => {
    const size = 180;
    const raw = Buffer.alloc(size * size * 3);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isWhite = (x + y) % 8 === 0;
        const val = isWhite ? 255 : 0;
        const idx = (y * size + x) * 3;
        raw[idx] = val;
        raw[idx + 1] = val;
        raw[idx + 2] = val;
      }
    }

    const img = await sharp(raw, { raw: { width: size, height: size, channels: 3 } }).jpeg().toBuffer();
    const result = await computeOpenCvMetrics(img);

    expect(result.success).toBe(true);
    expect(result.sharpness).toBeGreaterThan(40);
    expect(result.contrast).toBeGreaterThan(20);
  });

  test('should compute near-zero sharpness for blurry or flat images', async () => {
    const size = 100;
    const flat = Buffer.alloc(size * size * 3, 100);
    const img = await sharp(flat, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();

    const result = await computeOpenCvMetrics(img);
    expect(result.success).toBe(true);
    expect(result.sharpness).toBeLessThan(10);
  });

  test('should compute colorfulness for multi-chroma buffers', async () => {
    const size = 100;
    const raw = Buffer.alloc(size * size * 3);
    for (let i = 0; i < size * size; i++) {
      raw[i * 3] = 240; // Red
      raw[i * 3 + 1] = 50; // Green
      raw[i * 3 + 2] = 20; // Blue
    }

    const img = await sharp(raw, { raw: { width: size, height: size, channels: 3 } }).jpeg().toBuffer();
    const result = await computeOpenCvMetrics(img);

    expect(result.success).toBe(true);
    expect(result.colorfulness).toBeGreaterThan(15);
  });
});
