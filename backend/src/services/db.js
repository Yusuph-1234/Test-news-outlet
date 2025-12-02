import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool;

export function initDb() {
  if (pool) return pool;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  return pool;
}

export function getDb() {
  if (!pool) {
    throw new Error('DB not initialized. Call initDb() first.');
  }
  return pool;
}

export async function migrate() {
  const client = await getDb().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        source TEXT NOT NULL,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        published_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        hash TEXT NOT NULL UNIQUE
      );
      CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items (published_at DESC);
    `);
  } finally {
    client.release();
  }
}
