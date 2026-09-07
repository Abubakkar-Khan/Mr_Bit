import sharp from 'sharp';
import { scoreAesthetic } from '../src/modules/images/onnx_aesthetic.service.js';

describe('ONNX Aesthetic Evaluator (Jest Suite)', () => {
  let validBuffer;

  beforeAll(async () => {
    const size = 160;
    const raw = Buffer.alloc(size * size * 3, 200);
    validBuffer = await sharp(raw, { raw: { width: size, height: size, channels: 3 } }).jpeg().toBuffer();
  });

  test('should return aesthetic score within bounds (1.0 to 10.0)', async () => {
    const res = await scoreAesthetic(validBuffer, {
      sharpness: 50,
      contrast: 60,
      colorfulness: 40
    });

    expect(typeof res.score).toBe('number');
    expect(res.score).toBeGreaterThanOrEqual(1.0);
    expect(res.score).toBeLessThanOrEqual(10.0);
    expect(typeof res.passed).toBe('boolean');
    expect(typeof res.modelType).toBe('string');
  });

  test('should handle corrupted buffer without throwing an uncaught exception', async () => {
    const badBuffer = Buffer.from('invalid image data');
    const res = await scoreAesthetic(badBuffer);

    expect(res).toBeDefined();
    expect(res.score).toBeGreaterThanOrEqual(1.0);
  });
});
