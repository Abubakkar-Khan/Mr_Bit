import { Router } from 'express';
import db from '../../config/database.js';

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
      selected_categories, 
      predefined_caption, 
      sources_config 
    } = req.body;

    const stmt = db.prepare(`
      UPDATE settings 
      SET automation_enabled = ?,
          posting_time = ?,
          selected_categories = ?,
          predefined_caption = ?,
          sources_config = ?
      WHERE id = 1
    `);

    stmt.run(
      automation_enabled ? 1 : 0,
      posting_time,
      selected_categories,
      predefined_caption,
      sources_config
    );

    // If automation is toggled or time changed, we should ideally restart the cron job.
    // For simplicity, we can have the automation service poll settings or restart via an event.

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
