import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { applyAtkinsonDither } from './ascii.converter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../../../data/ascii-outputs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export async function convertToDitheredImage(inputBuffer) {
  const cols = 800; // Fixed high resolution for fine, crisp 1-bit look
  
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const ratio = metadata.height / metadata.width;
  const rows = Math.round(cols * ratio);

  const { data: pixelData, info } = await image
    .resize(cols, rows, { fit: 'fill' })
    .normalize()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ditheredBuffer = applyAtkinsonDither(pixelData, info.width, info.height);

  const finalImage = sharp(ditheredBuffer, { raw: { width: info.width, height: info.height, channels: 3 } });
  
  const filename = `retro_${Date.now()}.png`;
  const outputPath = path.join(outputDir, filename);

  await finalImage
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background: { r: 0, g: 0, b: 0 } })
    .png()
    .toFile(outputPath);

  return `/outputs/${filename}`;
}

export async function convertToAscii(buffer) { return {}; }
export async function renderAsciiToImage(result) { return ''; }
