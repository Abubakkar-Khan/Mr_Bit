import { Router } from 'express';
import { getRecentLogs, clearLogs, getActiveRun } from './logger.service.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const stage = req.query.stage || null;
    const level = req.query.level || null;
    const runId = req.query.runId || null;

    const logs = getRecentLogs(limit, { stage, level, runId });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', (req, res) => {
  try {
    const status = getActiveRun();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', (req, res) => {
  try {
    clearLogs();
    res.json({ message: 'Logs cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
