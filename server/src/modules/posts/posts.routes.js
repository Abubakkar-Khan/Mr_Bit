import { Router } from 'express';
import * as repo from './posts.repository.js';
import * as service from './posts.service.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const posts = repo.getAllPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/today', (req, res) => {
  try {
    const post = repo.getTodayPost();
    res.json(post || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/retry', async (req, res) => {
  try {
    const post = repo.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    await service.publishToFacebook(post, true);
    res.json({ message: 'Retry successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/publish-manual', async (req, res) => {
  try {
    const { imageUrl, caption } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Missing imageUrl' });

    // The createAndPublishPost function accepts (candidate, asciiOutputPath, caption)
    const result = await service.createAndPublishPost(null, imageUrl, caption);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
