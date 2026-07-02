import sharp from 'sharp';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, '../../../data/temp-images');

export async function scoreImage(imageUrl, candidateId) {
  let score = 0;
  const tempPath = path.join(tempDir, `thumb_${candidateId}.jpg`);

  try {
    // Download image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Get metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // 1. Resolution Score (0-20)
    const maxDim = Math.max(metadata.width, metadata.height);
    if (maxDim > 2000) score += 20;
    else if (maxDim > 1000) score += 15;
    else if (maxDim > 500) score += 10;
    else score += 0;

    // 2. Aspect Ratio (0-10)
    const ratio = metadata.width / metadata.height;
    if (ratio > 0.8 && ratio < 1.5) score += 10; // Close to square or 4:3
    else if (ratio >= 1.5 || ratio <= 0.8) score += 5; // Very wide or tall

    // 3. Contrast / Histogram analysis (simplified) (0-25)
    // We resize down and check standard deviation of grayscale pixels
    const stats = await image.resize(200, 200).grayscale().stats();
    // stats.channels[0].stdev gives us an idea of contrast
    const stdev = stats.channels[0].stdev;
    if (stdev > 60) score += 25;
    else if (stdev > 40) score += 15;
    else if (stdev > 20) score += 5;
    
    // Save a small thumbnail for the dashboard
    await image
      .resize(400, 400, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toFile(tempPath);

    return {
      score: Math.min(100, score + 20 /* base novelty/category points applied later */),
      thumbnailPath: tempPath
    };
  } catch (error) {
    console.error(`Failed to score image ${candidateId}:`, error.message);
    return { score: -1, thumbnailPath: null }; // Invalid/broken image
  }
}
