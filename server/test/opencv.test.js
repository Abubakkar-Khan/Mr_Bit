import { expect } from 'chai';
import sharp from 'sharp';
import { computeOpenCvMetrics } from '../src/modules/images/opencv_metrics.service.js';

describe('OpenCV Computer Vision Metrics Service (Mocha/Chai)', () => {
  it('should accurately calculate Laplacian variance on a sharp checkerboard pattern', async () => {
    // Generate a 200x200 high-frequency sharp pattern (black & white checkerboard)
    const size = 200;
    const channels = 3;
    const rawBuffer = Buffer.alloc(size * size * channels);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isWhite = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
        const val = isWhite ? 255 : 0;
        const idx = (y * size + x) * channels;
        rawBuffer[idx] = val;     // R
        rawBuffer[idx + 1] = val; // G
        rawBuffer[idx + 2] = val; // B
      }
    }

    const testImage = await sharp(rawBuffer, {
      raw: { width: size, height: size, channels }
    }).jpeg().toBuffer();

    const metrics = await computeOpenCvMetrics(testImage);

    expect(metrics).to.be.an('object');
    expect(metrics.success).to.be.true;
    expect(metrics.sharpness).to.be.a('number');
    expect(metrics.sharpness).to.be.greaterThan(50); // Sharp checkerboard has high Laplacian variance
    expect(metrics.contrast).to.be.greaterThan(40);
  });

  it('should detect low Laplacian variance on a solid or blurry image', async () => {
    // Generate a uniform flat gray image
    const size = 150;
    const channels = 3;
    const rawBuffer = Buffer.alloc(size * size * channels, 128);

    const flatImage = await sharp(rawBuffer, {
      raw: { width: size, height: size, channels }
    }).png().toBuffer();

    const metrics = await computeOpenCvMetrics(flatImage);

    expect(metrics.success).to.be.true;
    expect(metrics.sharpness).to.be.lessThan(5.0); // Flat image has near zero edge variance
    expect(metrics.contrast).to.be.lessThan(5.0);
  });

  it('should compute higher Hasler-Süsstrunk colorfulness on vibrant multi-color buffers', async () => {
    // Generate vibrant saturated color bands
    const size = 120;
    const channels = 3;
    const rawBuffer = Buffer.alloc(size * size * channels);

    for (let i = 0; i < size * size; i++) {
      rawBuffer[i * 3] = (i % 3 === 0) ? 255 : 10;     // Vibrant Red
      rawBuffer[i * 3 + 1] = (i % 3 === 1) ? 255 : 10; // Vibrant Green
      rawBuffer[i * 3 + 2] = (i % 3 === 2) ? 255 : 10; // Vibrant Blue
    }

    const vibrantImage = await sharp(rawBuffer, {
      raw: { width: size, height: size, channels }
    }).jpeg().toBuffer();

    const metrics = await computeOpenCvMetrics(vibrantImage);

    expect(metrics.success).to.be.true;
    expect(metrics.colorfulness).to.be.greaterThan(30.0);
  });

  it('should gracefully handle invalid or corrupted buffers without throwing uncaught exceptions', async () => {
    const invalidBuffer = Buffer.from('not an image');
    const metrics = await computeOpenCvMetrics(invalidBuffer);

    expect(metrics.success).to.be.false;
    expect(metrics.sharpness).to.equal(0);
    expect(metrics.colorfulness).to.equal(0);
  });
});
