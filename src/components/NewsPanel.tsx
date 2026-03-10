'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Newspaper, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';
import { tagNews } from '@/lib/newsTags';

interface FHNews {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface MergerItem {
  companyName: string;
  targetedCompanyName: string;
  transactionDate: string;
  description: string;
  url: string;
}

interface AIReview {
  importance: string;
  sentiment: string;
  review: string;
  affected: string[];
  action: string;
}

type Tab = 'MARKET' | 'COMPANY' | 'MA';

interface Props {
  symbol: string;
}

// ─── Individual news card with AI summarize ───────────────────────────────────

function NewsCard({ item, fmtTime }: { item: FHNews; fmtTime: (ts: number) => string }) {
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
        className="block px-2 pt-2 pb-1 hover:bg-[#1c2128] transition-colors group"
        style={{ textDecoration: 'none' }}
      >
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
          <span className="text-[11px] leading-tight font-medium group-hover:text-[#7dd3fc] transition-colors flex-1" style={{ color: '#e2e8f0' }}>
            {item.headline}
          </span>
          <ExternalLink size={9} style={{ color: '#374151', flexShrink: 0, marginTop: 2 }} />
        </div>
        {/* Source + time */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-wide" style={{ color: '#4b5563' }}>
            {item.source?.toUpperCase()}
          </span>
          <span className="text-[9px]" style={{ color: '#374151' }}>
            {fmtTime(item.datetime)}
          </span>
        </div>
      </a>

      {/* Summarize button */}
      <div className="px-2 pb-1.5 flex items-center gap-1">
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
        <div className="mx-2 mb-2 rounded p-2" style={{ background: '#0a0a14', border: '1px solid #1a1a2e' }}>
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
              {/* Importance + sentiment badges */}
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
              {/* Review text */}
              <p className="text-[9px] leading-relaxed" style={{ color: '#9ca3af' }}>
                {aiReview.review}
              </p>
              {/* Affected areas */}
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
              {/* Action */}
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

// ─── Main NewsPanel ───────────────────────────────────────────────────────────

export default function NewsPanel({ symbol }: Props) {
  const [tab, setTab] = useState<Tab>('MARKET');
  const [marketNews, setMarketNews] = useState<FHNews[]>([]);
  const [companyNews, setCompanyNews] = useState<FHNews[]>([]);
  const [mergers, setMergers] = useState<MergerItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMarket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/finnhub/news');
      const data = await res.json();
      setMarketNews(data.news || []);
    } catch { setMarketNews([]); }
    finally { setLoading(false); }
  }, []);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/finnhub/company-news?symbol=${symbol}`);
      const data = await res.json();
      setCompanyNews(data.news || []);
    } catch { setCompanyNews([]); }
    finally { setLoading(false); }
  }, [symbol]);

  const fetchMergers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/fmp/mergers');
      const data = await res.json();
      setMergers(data.mergers || []);
    } catch { setMergers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'MARKET') fetchMarket();
    else if (tab === 'COMPANY') fetchCompany();
    else if (tab === 'MA') fetchMergers();
  }, [tab, fetchMarket, fetchCompany, fetchMergers]);

  useEffect(() => {
    if (tab === 'COMPANY') fetchCompany();
  }, [symbol, tab, fetchCompany]);

  const fmtTime = (ts: number) => {
    try { return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true }); }
    catch { return ''; }
  };

  const refresh = () => {
    if (tab === 'MARKET') fetchMarket();
    else if (tab === 'COMPANY') fetchCompany();
    else fetchMergers();
  };

  const TAB_COLORS: Record<Tab, string> = { MARKET: '#38bdf8', COMPANY: '#e2c97e', MA: '#f472b6' };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#21262d' }}>
        <div className="flex items-center gap-1.5">
          <Newspaper size={11} style={{ color: '#6b7280' }} />
          <div className="flex gap-0.5">
            {(['MARKET', 'COMPANY', 'MA'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest transition-all"
                style={{
                  background: tab === t ? `${TAB_COLORS[t]}18` : 'transparent',
                  border: `1px solid ${tab === t ? TAB_COLORS[t] : '#21262d'}`,
                  color: tab === t ? TAB_COLORS[t] : '#374151',
                }}
              >
                {t === 'MA' ? 'M&A' : t}
              </button>
            ))}
          </div>
        </div>
        <button onClick={refresh} className="p-0.5 rounded hover:bg-[#21262d] transition-colors">
          <RefreshCw size={9} style={{ color: loading ? '#f5a623' : '#4b5563' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-2 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-3/4 rounded shimmer" />
                <div className="h-3 w-full rounded shimmer" />
                <div className="h-2 w-1/3 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : tab === 'MA' ? (
          mergers.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <span className="text-[10px]" style={{ color: '#374151' }}>NO M&A DATA</span>
            </div>
          ) : (
            <div>
              {mergers.map((m, i) => (
                <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                  className="block px-2 py-2 hover:bg-[#1c2128] transition-colors border-b group"
                  style={{ borderColor: '#1c2128', textDecoration: 'none' }}
                >
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <span className="text-[10px] leading-tight font-bold group-hover:text-[#f9a8d4] transition-colors" style={{ color: '#f472b6' }}>
                      {m.companyName} → {m.targetedCompanyName}
                    </span>
                    <ExternalLink size={9} style={{ color: '#374151', flexShrink: 0, marginTop: 2 }} />
                  </div>
                  <p className="text-[9px] leading-tight mb-0.5 line-clamp-2" style={{ color: '#6b7280' }}>{m.description}</p>
                  <span className="text-[9px] font-bold" style={{ color: '#374151' }}>{m.transactionDate}</span>
                </a>
              ))}
            </div>
          )
        ) : (
          (() => {
            const items = tab === 'MARKET' ? marketNews : companyNews;
            return items.length === 0 ? (
              <div className="flex items-center justify-center h-24">
                <span className="text-[10px]" style={{ color: '#374151' }}>
                  {tab === 'COMPANY' ? `NO NEWS FOR ${symbol}` : 'NO MARKET NEWS'}
                </span>
              </div>
            ) : (
              <div>
                {items.map((item, i) => (
                  <NewsCard key={`${item.id}-${i}`} item={item} fmtTime={fmtTime} />
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
