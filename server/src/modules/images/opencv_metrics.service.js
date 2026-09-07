import sharp from 'sharp';

/**
 * Compute OpenCV-equivalent image quality metrics:
 * 1. Laplacian Variance (Sharpness/Clarity)
 * 2. Hasler and Süsstrunk Colorfulness Metric
 * 3. RMS Dynamic Contrast
 */
export async function computeOpenCvMetrics(imageBuffer) {
  try {
    // 1. Compute Laplacian Variance for Sharpness
    // Resize to normalized evaluation dimension for consistent scale regardless of resolution
    const evalSize = 360;
    
    // Standard 3x3 Laplacian discrete edge kernel
    const laplacianKernel = {
      width: 3,
      height: 3,
      kernel: [
        0,  1,  0,
        1, -4,  1,
        0,  1,  0
      ]
    };

    const { data: edgeData, info: edgeInfo } = await sharp(imageBuffer)
      .resize(evalSize, evalSize, { fit: 'inside' })
      .grayscale()
      .convolve(laplacianKernel)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Variance = sum((x - mean)^2) / N
    const N = edgeData.length;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += edgeData[i];
    }
    const mean = sum / N;

    let varianceSum = 0;
    for (let i = 0; i < N; i++) {
      const diff = edgeData[i] - mean;
      varianceSum += diff * diff;
    }
    const laplacianVariance = Math.round((varianceSum / N) * 100) / 100;

    // 2. Colorfulness and Dynamic Contrast
    const { data: rgbData, info: rgbInfo } = await sharp(imageBuffer)
      .resize(150, 150, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = rgbInfo.width * rgbInfo.height;
    let sumR = 0, sumG = 0, sumB = 0;
    const rgArray = new Float32Array(pixelCount);
    const ybArray = new Float32Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      const r = rgbData[i * 3];
      const g = rgbData[i * 3 + 1];
      const b = rgbData[i * 3 + 2];

      sumR += r;
      sumG += g;
      sumB += b;

      // Hasler & Süsstrunk channels: rg = |R - G|, yb = |0.5(R + G) - B|
      rgArray[i] = Math.abs(r - g);
      ybArray[i] = Math.abs(0.5 * (r + g) - b);
    }

    // Standard deviation and mean of rg and yb
    const meanRg = rgArray.reduce((acc, v) => acc + v, 0) / pixelCount;
    const meanYb = ybArray.reduce((acc, v) => acc + v, 0) / pixelCount;

    let varRgSum = 0;
    let varYbSum = 0;
    for (let i = 0; i < pixelCount; i++) {
      varRgSum += (rgArray[i] - meanRg) ** 2;
      varYbSum += (ybArray[i] - meanYb) ** 2;
    }

    const stdRg = Math.sqrt(varRgSum / pixelCount);
    const stdYb = Math.sqrt(varYbSum / pixelCount);
    const colorfulness = Math.round(
      (Math.sqrt(stdRg * stdRg + stdYb * stdYb) + 0.3 * Math.sqrt(meanRg * meanRg + meanYb * meanYb)) * 100
    ) / 100;

    // RMS Luminance Contrast
    const stats = await sharp(imageBuffer).grayscale().stats();
    const contrast = Math.round((stats.channels[0]?.stdev || 0) * 100) / 100;

    return {
      success: true,
      sharpness: laplacianVariance,
      colorfulness,
      contrast,
      metadata: {
        width: rgbInfo.width,
        height: rgbInfo.height,
        stdev: contrast
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      sharpness: 0,
      colorfulness: 0,
      contrast: 0
    };
  }
}
