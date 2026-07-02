import { Router } from 'express';
import * as repo from './images.repository.js';
import * as service from './images.service.js';
import { convertToDitheredImage } from '../ascii/ascii.service.js';
import { createAndPublishPost } from '../posts/posts.service.js';
import axios from 'axios';

const router = Router();

router.get('/candidates', (req, res) => {
  try {
    const candidates = repo.getTodayCandidates();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/fetch', async (req, res) => {
  try {
    const candidates = await service.fetchAndScoreCandidates();
    res.json({ message: 'Fetch complete', candidates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/select/:id', async (req, res) => {
  try {
    const candidate = repo.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    
    repo.updateCandidateStatus(req.params.id, 'selected');

    // Automatically convert and post upon selection
    const response = await axios.get(candidate.image_url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const imagePath = await convertToDitheredImage(buffer);
    const result = await createAndPublishPost(candidate, imagePath, candidate.title);

    res.json({ message: 'Candidate selected and published successfully', facebookPostId: result.facebookPostId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/candidates/:id', (req, res) => {
  try {
    repo.updateCandidateStatus(req.params.id, 'rejected');
    res.json({ message: 'Candidate rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
