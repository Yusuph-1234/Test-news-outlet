import { migrate } from './db.js';
import { aggregateBreakingNews, getLatestNewsFromDb } from './newsFetcher.js';

export async function getLatestNews() {
  await migrate();
  return getLatestNewsFromDb(50);
}

export async function triggerManualRefresh() {
  await migrate();
  return aggregateBreakingNews();
}
