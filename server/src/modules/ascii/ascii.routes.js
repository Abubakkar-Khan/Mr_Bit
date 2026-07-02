import { Router } from 'express';
import multer from 'multer';
import { convertToDitheredImage } from './ascii.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/convert', upload.single('image'), async (req, res) => {
  try {
    let buffer;
    
    if (req.file) {
      buffer = req.file.buffer;
    } else if (req.body.imageUrl) {
      const response = await fetch(req.body.imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image from URL');
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return res.status(400).json({ error: 'No image file or URL provided' });
    }

    const imageUrl = await convertToDitheredImage(buffer);

    res.json({
      success: true,
      imageUrl
    });
  } catch (error) {
    console.error('Error generating retro image:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
