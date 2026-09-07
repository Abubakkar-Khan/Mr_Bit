import { Router } from 'express';
import db from '../../config/database.js';
import { startCronJob } from '../automation/automation.service.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
    const settings = stmt.get();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', (req, res) => {
  try {
    const { 
      automation_enabled, 
      posting_time, 
      posts_per_day,
      selected_categories, 
      predefined_caption, 
      sources_config,
      pinterest_queries,
      min_saves,
      min_dimension,
      max_dimension,
      min_sharpness,
      min_aesthetic_score
    } = req.body;

    const stmt = db.prepare(`
      UPDATE settings 
      SET automation_enabled = ?,
          posting_time = ?,
          posts_per_day = ?,
          selected_categories = ?,
          predefined_caption = ?,
          sources_config = ?,
          pinterest_queries = ?,
          min_saves = ?,
          min_dimension = ?,
          max_dimension = ?,
          min_sharpness = ?,
          min_aesthetic_score = ?
      WHERE id = 1
    `);

    stmt.run(
      automation_enabled ? 1 : 0,
      posting_time || '10:00',
      Number(posts_per_day) || 1,
      selected_categories ? (typeof selected_categories === 'string' ? selected_categories : JSON.stringify(selected_categories)) : '[]',
      predefined_caption || '',
      sources_config ? (typeof sources_config === 'string' ? sources_config : JSON.stringify(sources_config)) : '{"pinterest":true}',
      pinterest_queries ? (typeof pinterest_queries === 'string' ? pinterest_queries : JSON.stringify(pinterest_queries)) : '["digital art trending"]',
      Number(min_saves) || 50,
      Number(min_dimension) || 600,
      Number(max_dimension) || 2048,
      Number(min_sharpness) || 20.0,
      Number(min_aesthetic_score) || 5.0
    );

    // Restart cron job with new schedule parameters if needed
    try {
      startCronJob();
    } catch (cronErr) {
      console.warn('Cron restart notice:', cronErr.message);
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
