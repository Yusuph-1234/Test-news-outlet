import crypto from 'crypto';
import axios from 'axios';
import { getDb } from './db.js';
import { summarizeAndClassifyArticle } from './ai.js';

// Basic placeholder source list. You can extend this with RSS feeds or APIs.
const SOURCES = [
  {
    id: 'bbc-world',
    type: 'json-api',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    parser: 'rss',
    displayName: 'BBC World',
  },
  {
    id: 'ap-top',
    type: 'json-api',
    url: 'https://rss.apnews.com/apf-topnews',
    parser: 'rss',
    displayName: 'AP Top News',
  },
];

export async function aggregateBreakingNews() {
  const rawItems = [];

  for (const source of SOURCES) {
    try {
      const items = await fetchFromSource(source);
      rawItems.push(...items);
    } catch (err) {
      console.error('Error fetching from source', source.id, err.message);
    }
  }

  const deduped = dedupeByHash(rawItems);

  const results = {
    fetched: rawItems.length,
    considered: deduped.length,
    stored: 0,
    breakingStored: 0,
  };

  for (const item of deduped) {
    try {
      const { summary, isBreaking, tags } = await summarizeAndClassifyArticle(item);
      if (!isBreaking) continue;

      const hash = hashItem(item);

      const client = await getDb().connect();
      try {
        await client.query(
          `INSERT INTO news_items (title, summary, source, url, thumbnail_url, tags, published_at, hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (hash) DO NOTHING`,
          [
            item.title,
            summary,
            item.source,
            item.url,
            item.thumbnailUrl || null,
            tags,
            item.publishedAt,
            hash,
          ]
        );
        results.breakingStored += 1;
      } finally {
        client.release();
      }

      results.stored += 1;
    } catch (err) {
      console.error('Error processing article', item.title, err.message);
    }
  }

  return results;
}

export async function getLatestNewsFromDb(limit = 50) {
  const client = await getDb().connect();
  try {
    const { rows } = await client.query(
      `SELECT id, title, summary, source, url, thumbnail_url AS "thumbnailUrl", tags, published_at AS "publishedAt", created_at AS "createdAt"
       FROM news_items
       ORDER BY published_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  } finally {
    client.release();
  }
}

function hashItem(item) {
  const h = crypto.createHash('sha256');
  h.update(item.title || '');
  h.update(item.url || '');
  const published = item.publishedAt ? new Date(item.publishedAt).toISOString() : '';
  h.update(published);
  return h.digest('hex');
}

function dedupeByHash(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const hash = hashItem(item);
    if (seen.has(hash)) continue;
    seen.add(hash);
    result.push(item);
  }
  return result;
}

async function fetchFromSource(source) {
  if (source.parser === 'rss') {
    return fetchRssSource(source);
  }
  return [];
}

async function fetchRssSource(source) {
  const { data } = await axios.get(source.url, { timeout: 10000 });

  // Simple, dependency-free RSS parsing using regex/DOM-like string ops.
  // For production you may want to introduce a proper RSS parser.
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(data)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');

    if (!title || !link) continue;

    items.push({
      title: decodeHtml(title.trim()),
      content: decodeHtml(description || '').trim(),
      url: link.trim(),
      source: source.displayName,
      thumbnailUrl: null,
      publishedAt: pubDate ? new Date(pubDate) : new Date(),
    });
  }

  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(regex);
  return m ? m[1] : '';
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
