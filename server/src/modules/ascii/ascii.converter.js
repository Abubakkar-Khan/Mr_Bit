export function applyAtkinsonDither(pixelData, width, height) {
  // We'll use pure Black and White for the classic 1-bit look
  // but we can tint it later in sharp if needed. For now: 0 or 255.
  
  // Create a Float32 array for accurate error diffusion
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    // Sharp provides 3 channels (RGB)
    const idx = i * 3;
    lum[i] = 0.299 * pixelData[idx] + 0.587 * pixelData[idx + 1] + 0.114 * pixelData[idx + 2];
  }

  const outBuffer = Buffer.alloc(width * height * 3); // RGB output

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let oldPixel = lum[idx];
      
      // Clamp
      if (oldPixel < 0) oldPixel = 0;
      if (oldPixel > 255) oldPixel = 255;

      // Threshold at 50%
      const newPixel = oldPixel < 128 ? 0 : 255;
      const err = Math.floor((oldPixel - newPixel) / 8); // Atkinson error divisor

      // Diffuse error
      if (x + 1 < width) lum[y * width + x + 1] += err;
      if (x + 2 < width) lum[y * width + x + 2] += err;
      if (y + 1 < height) {
        if (x - 1 >= 0) lum[(y + 1) * width + x - 1] += err;
        lum[(y + 1) * width + x] += err;
        if (x + 1 < width) lum[(y + 1) * width + x + 1] += err;
      }
      if (y + 2 < height) {
        lum[(y + 2) * width + x] += err;
      }

      // Write to output buffer (RGB)
      const outIdx = idx * 3;
      outBuffer[outIdx] = newPixel;
      outBuffer[outIdx + 1] = newPixel;
      outBuffer[outIdx + 2] = newPixel;
    }
  }

  return outBuffer;
}
