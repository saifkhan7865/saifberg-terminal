'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { formatDistanceToNow } from 'date-fns';
import { tagNews } from '@/lib/newsTags';

interface NewsItem {
  headline: string;
  source: string;
  datetime: number;
  url: string;
  summary: string;
  image: string;
}

interface AIReview {
  importance: string;
  sentiment: string;
  review: string;
  affected: string[];
  action: string;
}

// ─── Individual card with AI summarize ───────────────────────────────────────

function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);
  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const tag = tagNews(item.headline, item.summary);

  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (aiReview) { setExpanded(v => !v); return; }
    setExpanded(true);
    setAiLoading(true);
    setAiError('');
    try {
      const res = await apiFetch('/api/ai-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: item.headline, summary: item.summary, source: item.source }),
      });
      const data = await res.json();
      if (data.error) setAiError(data.error);
      else setAiReview(data);
    } catch { setAiError('Failed to analyze'); }
    finally { setAiLoading(false); }
  };

  const sentimentColor = aiReview?.sentiment === 'BULLISH' ? '#4ade80' : aiReview?.sentiment === 'BEARISH' ? '#ef4444' : '#e2c97e';
  const importanceColor = aiReview?.importance === 'HIGH' ? '#ef4444' : aiReview?.importance === 'MEDIUM' ? '#f97316' : '#6b7280';

  return (
    <div className="border-b" style={{ borderColor: '#1c2128' }}>
      <a href={item.url} target="_blank" rel="noopener noreferrer"
        className="block px-3 pt-2 pb-1 hover:bg-[#1c2128] transition-colors group"
        style={{ textDecoration: 'none' }}
      >
        {item.image && (
          <div className="w-full h-20 mb-1.5 overflow-hidden rounded" style={{ background: '#1c2128' }}>
            <img src={item.image} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        {/* Tag + headline */}
        <div className="flex items-start gap-1.5 mb-0.5">
          {tag && (
            <span
              className="flex-shrink-0 text-[7px] font-black tracking-widest px-1 py-0.5 rounded mt-0.5"
              style={{ color: tag.color, background: tag.bg, border: `1px solid ${tag.color}30` }}
            >
              {tag.label}
            </span>
          )}
          <span className="text-[11px] leading-snug font-medium group-hover:text-[#7dd3fc] transition-colors flex-1" style={{ color: '#e2e8f0' }}>
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

      {/* Summarize button */}
      <div className="px-3 pb-1.5 flex items-center gap-1">
        <button
          onClick={handleSummarize}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider transition-all"
          style={{
            background: expanded ? '#a78bfa18' : 'transparent',
            border: `1px solid ${expanded ? '#a78bfa' : '#21262d'}`,
            color: expanded ? '#a78bfa' : '#374151',
          }}
        >
          <Sparkles size={7} />
          {aiReview ? (expanded ? 'HIDE' : 'SHOW') : 'SUMMARIZE'}
          {aiReview && (expanded ? <ChevronUp size={7} /> : <ChevronDown size={7} />)}
        </button>
      </div>

      {/* AI Review Panel */}
      {expanded && (
        <div className="mx-3 mb-2 rounded p-2" style={{ background: '#0a0a14', border: '1px solid #1a1a2e' }}>
          {aiLoading ? (
            <div className="space-y-1.5">
              <div className="h-2 w-1/2 rounded shimmer" />
              <div className="h-2 w-full rounded shimmer" />
              <div className="h-2 w-3/4 rounded shimmer" />
            </div>
          ) : aiError ? (
            <p className="text-[9px]" style={{ color: '#ef4444' }}>{aiError}</p>
          ) : aiReview ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-black px-1 py-0.5 rounded"
                  style={{ color: importanceColor, background: `${importanceColor}20`, border: `1px solid ${importanceColor}40` }}>
                  {aiReview.importance} IMPACT
                </span>
                <span className="text-[7px] font-black px-1 py-0.5 rounded"
                  style={{ color: sentimentColor, background: `${sentimentColor}20`, border: `1px solid ${sentimentColor}40` }}>
                  {aiReview.sentiment}
                </span>
              </div>
              <p className="text-[9px] leading-relaxed" style={{ color: '#9ca3af' }}>
                {aiReview.review}
              </p>
              {aiReview.affected?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[8px] font-bold" style={{ color: '#4b5563' }}>AFFECTS:</span>
                  {aiReview.affected.map((a, i) => (
                    <span key={i} className="text-[8px] px-1 py-0.5 rounded" style={{ background: '#21262d', color: '#9ca3af' }}>
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <div className="pt-1" style={{ borderTop: '1px solid #1a1a2e' }}>
                <span className="text-[8px] font-bold" style={{ color: '#a78bfa' }}>⚡ {aiReview.action}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#21262d' }}>
        <span className="text-[10px] font-bold tracking-widest" style={{ color: '#38bdf8' }}>CN · {symbol} COMPANY NEWS</span>
        <button onClick={fetchNews} className="p-0.5 rounded hover:bg-[#21262d]">
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
          news.map((item, i) => <NewsCard key={i} item={item} />)
        )}
      </div>
    </div>
  );
}
