import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadNews() {
    try {
      setError('');
      const res = await axios.get(`${API_BASE}/api/news`);
      setItems(res.data.items || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load news. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              AI-Powered Breaking News
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time AI summarized headlines from trusted global sources
            </p>
          </div>
          <button
            onClick={loadNews}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
        {loading && (
          <p className="text-slate-400 text-sm">Loading breaking news…</p>
        )}
        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}

        <div className="space-y-3 sm:space-y-4">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <div className="p-3 sm:p-4 flex gap-3">
                {item.thumbnailUrl && (
                  <div className="hidden sm:block flex-shrink-0 w-28 h-20 overflow-hidden rounded-lg bg-slate-800">
                    <img
                      src={item.thumbnailUrl}
                      alt="thumbnail"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-sky-400 font-semibold bg-sky-400/10 px-2 py-0.5 rounded-full">
                      Breaking
                    </span>
                    {item.source && (
                      <span className="text-[11px] text-slate-400">{item.source}</span>
                    )}
                    {item.publishedAt && (
                      <span className="text-[11px] text-slate-500 ml-auto">
                        {formatTime(item.publishedAt)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-base font-semibold text-slate-50 line-clamp-2 mb-1">
                    {item.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3">
                    {item.summary}
                  </p>

                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}

          {!loading && !error && items.length === 0 && (
            <p className="text-slate-400 text-sm">
              No breaking news available yet. Please check back shortly.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
