import { Router } from 'express';
import * as service from './automation.service.js';
import db from '../../config/database.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json(service.getStatus());
});

router.post('/run', async (req, res) => {
  try {
    const result = await service.runFullPipeline();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const stmt = db.prepare('UPDATE settings SET automation_enabled = ? WHERE id = 1');
    stmt.run(enabled ? 1 : 0);
    
    // Restart cron job with new setting
    service.startCronJob();
    
    res.json({ message: `Automation ${enabled ? 'enabled' : 'disabled'}`, enabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
