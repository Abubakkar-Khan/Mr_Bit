import { expect } from 'chai';
import sharp from 'sharp';
import { scoreAesthetic } from '../src/modules/images/onnx_aesthetic.service.js';

describe('Quantized ONNX Aesthetic Scoring Service (Mocha/Chai)', () => {
  let sampleImageBuffer;

  before(async () => {
    // Create a 240x240 gradient sample image
    const size = 240;
    const channels = 3;
    const raw = Buffer.alloc(size * size * channels);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * channels;
        raw[idx] = Math.floor((x / size) * 255);
        raw[idx + 1] = Math.floor((y / size) * 255);
        raw[idx + 2] = Math.floor(((x + y) / (2 * size)) * 255);
      }
    }

    sampleImageBuffer = await sharp(raw, {
      raw: { width: size, height: size, channels }
    }).jpeg().toBuffer();
  });

  it('should return a score between 1.0 and 10.0 for valid image buffers', async () => {
    const result = await scoreAesthetic(sampleImageBuffer, {
      sharpness: 45,
      contrast: 55,
      colorfulness: 38
    });

    expect(result).to.be.an('object');
    expect(result.score).to.be.a('number');
    expect(result.score).to.be.at.least(1.0);
    expect(result.score).to.be.at.most(10.0);
    expect(result.passed).to.be.a('boolean');
    expect(result.modelType).to.be.a('string');
  });

  it('should yield a passing aesthetic status for well-composed, high-contrast visuals', async () => {
    const highQualityResult = await scoreAesthetic(sampleImageBuffer, {
      sharpness: 80,
      contrast: 65,
      colorfulness: 50
    });

    expect(highQualityResult.score).to.be.greaterThanOrEqual(5.0);
    expect(highQualityResult.passed).to.be.true;
  });

  it('should handle corrupted or null buffers gracefully with a safe default score', async () => {
    const fallbackResult = await scoreAesthetic(Buffer.from('corrupt data'));

    expect(fallbackResult).to.be.an('object');
    expect(fallbackResult.score).to.be.a('number');
    expect(fallbackResult.score).to.be.at.least(1.0);
  });
});
