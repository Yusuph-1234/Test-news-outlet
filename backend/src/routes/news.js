import { Router } from 'express';
import { getLatestNews, triggerManualRefresh } from '../services/newsService.js';

const router = Router();

// GET /api/news - latest breaking news feed
router.get('/', async (req, res) => {
  try {
    const items = await getLatestNews();
    res.json({ items });
  } catch (err) {
    console.error('Error in GET /api/news', err);
    res.status(500).json({ error: 'Failed to fetch news feed' });
  }
});

// POST /api/news/refresh - manual trigger for aggregation (simple shared-secret auth)
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!process.env.ADMIN_REFRESH_TOKEN || token !== process.env.ADMIN_REFRESH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await triggerManualRefresh();
    res.json({ status: 'ok', ...result });
  } catch (err) {
    console.error('Error in POST /api/news/refresh', err);
    res.status(500).json({ error: 'Failed to refresh news' });
  }
});

export default router;
