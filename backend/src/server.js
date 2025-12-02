import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import newsRouter from './routes/news.js';
import { initDb } from './services/db.js';
import { scheduleNewsJob, runInitialSyncIfNeeded } from './services/scheduler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Basic middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*'}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

// News routes
app.use('/api/news', newsRouter);

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await initDb();
    await runInitialSyncIfNeeded();
    scheduleNewsJob();

    httpServer.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
