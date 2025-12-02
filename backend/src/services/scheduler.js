import cron from 'node-cron';
import { migrate } from './db.js';
import { aggregateBreakingNews } from './newsFetcher.js';

let jobScheduled = false;

export function scheduleNewsJob() {
  if (jobScheduled) return;

  const cronExpr = process.env.NEWS_CRON || '*/15 * * * *'; // every 15 minutes by default

  cron.schedule(cronExpr, async () => {
    try {
      await migrate();
      const result = await aggregateBreakingNews();
      console.log('[CRON] Aggregated news', result);
    } catch (err) {
      console.error('[CRON] Error while aggregating news', err);
    }
  });

  jobScheduled = true;
}

export async function runInitialSyncIfNeeded() {
  if (process.env.RUN_INITIAL_SYNC === 'false') return;
  try {
    await migrate();
    const result = await aggregateBreakingNews();
    console.log('[INIT] Initial news aggregation complete', result);
  } catch (err) {
    console.error('[INIT] Error during initial aggregation', err);
  }
}
