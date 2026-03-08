'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';

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

type Tab = 'MARKET' | 'COMPANY' | 'MA';

interface Props {
  symbol: string;
}

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
      <div className="flex items-center justify-between px-2 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-1.5">
          <Newspaper size={11} style={{ color: '#6b7280' }} />
          <div className="flex gap-0.5">
            {(['MARKET', 'COMPANY', 'MA'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest transition-all"
                style={{
                  background: tab === t ? `${TAB_COLORS[t]}18` : 'transparent',
                  border: `1px solid ${tab === t ? TAB_COLORS[t] : '#1a1a1a'}`,
                  color: tab === t ? TAB_COLORS[t] : '#374151',
                }}
              >
                {t === 'MA' ? 'M&A' : t}
              </button>
            ))}
          </div>
        </div>
        <button onClick={refresh} className="p-0.5 rounded hover:bg-[#1a1a1a] transition-colors">
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
                  className="block px-2 py-2 hover:bg-[#111] transition-colors border-b group"
                  style={{ borderColor: '#0d0d0d', textDecoration: 'none' }}
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
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="block px-2 py-2 hover:bg-[#111] transition-colors border-b group"
                    style={{ borderColor: '#0d0d0d', textDecoration: 'none' }}
                  >
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <span className="text-[11px] leading-tight font-medium group-hover:text-[#7dd3fc] transition-colors" style={{ color: '#c9b97a' }}>
                        {item.headline}
                      </span>
                      <ExternalLink size={9} style={{ color: '#374151', flexShrink: 0, marginTop: 2 }} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold tracking-wide" style={{ color: '#4b5563' }}>
                        {item.source?.toUpperCase()}
                      </span>
                      <span className="text-[9px]" style={{ color: '#374151' }}>
                        {fmtTime(item.datetime)}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
