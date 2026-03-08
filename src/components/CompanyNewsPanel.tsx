'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { formatDistanceToNow } from 'date-fns';

interface NewsItem {
  headline: string;
  source: string;
  datetime: number;
  url: string;
  summary: string;
  image: string;
}

export default function CompanyNewsPanel({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/finnhub/company-news?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setNews(data.news || []);
    } catch { setError('Failed to load news'); }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <span className="text-[10px] font-bold tracking-widest" style={{ color: '#38bdf8' }}>CN · {symbol} COMPANY NEWS</span>
        <button onClick={fetchNews} className="p-0.5 rounded hover:bg-[#1a1a1a]">
          <RefreshCw size={9} style={{ color: loading ? '#38bdf8' : '#4b5563' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 p-4">
            <span className="text-[10px] font-bold text-center" style={{ color: '#ef4444' }}>{error}</span>
            {error.includes('configured') && (
              <span className="text-[9px] text-center" style={{ color: '#374151' }}>Add your Finnhub key in Settings ⚙</span>
            )}
          </div>
        ) : news.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px]" style={{ color: '#374151' }}>NO RECENT NEWS</span>
          </div>
        ) : (
          news.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              className="block px-3 py-2 border-b hover:bg-[#0d0d0d] transition-colors group"
              style={{ borderColor: '#0d0d0d', textDecoration: 'none' }}
            >
              {item.image && (
                <div className="w-full h-20 mb-1.5 overflow-hidden rounded" style={{ background: '#111' }}>
                  <img src={item.image} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <span className="text-[11px] leading-snug font-medium group-hover:text-[#7dd3fc] transition-colors" style={{ color: '#c9b97a' }}>
                  {item.headline}
                </span>
                <ExternalLink size={9} style={{ color: '#374151', flexShrink: 0, marginTop: 2 }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold" style={{ color: '#4b5563' }}>{item.source?.toUpperCase()}</span>
                <span className="text-[9px]" style={{ color: '#374151' }}>
                  {item.datetime ? formatDistanceToNow(new Date(item.datetime * 1000), { addSuffix: true }) : ''}
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
