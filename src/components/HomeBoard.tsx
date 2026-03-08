'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, BarChart2, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';

interface QuoteMini {
  symbol: string;
  price: number;
  changesPercentage: number;
  name: string;
}

interface FHNews {
  datetime: number;
  headline: string;
  source: string;
  url: string;
  category: string;
}

const MARQUEE_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'BTC-USD', 'ETH-USD', 'GLD', 'USO', 'VIX'];

const FEATURED = [
  { symbol: 'SPY',    label: 'S&P 500',    color: '#22c55e' },
  { symbol: 'QQQ',    label: 'Nasdaq 100', color: '#38bdf8' },
  { symbol: 'DIA',    label: 'Dow Jones',  color: '#f5a623' },
  { symbol: 'IWM',    label: 'Russell 2K', color: '#a78bfa' },
  { symbol: 'VIX',    label: 'Volatility', color: '#fb923c' },
  { symbol: 'GLD',    label: 'Gold',       color: '#fbbf24' },
];

const POPULAR_STOCKS = [
  { symbol: 'AAPL',   sector: 'Technology' },
  { symbol: 'MSFT',   sector: 'Technology' },
  { symbol: 'NVDA',   sector: 'Semiconductors' },
  { symbol: 'GOOGL',  sector: 'Technology' },
  { symbol: 'META',   sector: 'Social Media' },
  { symbol: 'AMZN',   sector: 'E-Commerce' },
  { symbol: 'TSLA',   sector: 'EV / Auto' },
  { symbol: 'JPM',    sector: 'Financials' },
  { symbol: 'BRK-B',  sector: 'Financials' },
  { symbol: 'UNH',    sector: 'Healthcare' },
  { symbol: 'XOM',    sector: 'Energy' },
  { symbol: 'JNJ',    sector: 'Healthcare' },
];

const fmtPrice = (v: number) => {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1000)  return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return v.toFixed(2);
};
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

interface Props {
  onSelect: (symbol: string) => void;
}

export default function HomeBoard({ onSelect }: Props) {
  const [quotes, setQuotes]   = useState<Record<string, QuoteMini>>({});
  const [news, setNews]       = useState<FHNews[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [loadingN, setLoadingN] = useState(true);

  const fetchQuotes = useCallback(async () => {
    setLoadingQ(true);
    try {
      const res = await apiFetch(`/api/quotes-batch?symbols=${MARQUEE_SYMBOLS.join(',')}`);
      const data = await res.json();
      const map: Record<string, QuoteMini> = {};
      for (const q of (data.quotes || [])) map[q.symbol] = q;
      setQuotes(map);
    } catch { /* noop */ }
    finally { setLoadingQ(false); }
  }, []);

  const fetchNews = useCallback(async () => {
    setLoadingN(true);
    try {
      const res = await apiFetch('/api/finnhub/news');
      const data = await res.json();
      setNews(data.news || []);
    } catch { setNews([]); }
    finally { setLoadingN(false); }
  }, []);

  useEffect(() => {
    fetchQuotes();
    fetchNews();
    const iv = setInterval(fetchQuotes, 60000);
    return () => clearInterval(iv);
  }, [fetchQuotes, fetchNews]);

  const fmtTime = (ts: number) => {
    try { return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true }); }
    catch { return ''; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#000' }}>

      {/* ── Hero banner ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 py-6 border-b" style={{ borderColor: '#1a1a1a', background: '#030303' }}>
        <div className="flex items-center gap-3 mb-1">
          <BarChart2 size={20} style={{ color: '#f5a623' }} />
          <span className="text-[22px] font-black tracking-[0.15em]" style={{ color: '#f5a623', textShadow: '0 0 20px rgba(245,166,35,0.3)' }}>
            SAIFBERG TERMINAL
          </span>
        </div>
        <p className="text-[11px] tracking-widest ml-9" style={{ color: '#374151' }}>
          REAL-TIME MARKET DATA · BLOOMBERG-STYLE COMMANDS · AI ANALYSIS
        </p>

        <div className="mt-4 flex items-center gap-2 ml-9">
          <Search size={12} style={{ color: '#4b5563' }} />
          <span className="text-[11px]" style={{ color: '#4b5563' }}>
            Type a ticker in the search bar above to begin analysis —
          </span>
          {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'BTC-USD'].map(s => (
            <button key={s} onClick={() => onSelect(s)}
              className="px-2 py-0.5 rounded text-[9px] font-bold transition-all hover:bg-[#1a0f00]"
              style={{ border: '1px solid #2a2a2a', color: '#f5a623' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-0" style={{ height: '100%' }}>

          {/* ── Left: Markets grid ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto border-r p-4" style={{ borderColor: '#1a1a1a' }}>

            {/* Featured indices */}
            <div className="mb-1 text-[9px] font-black tracking-[0.2em]" style={{ color: '#374151' }}>INDICES</div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {FEATURED.map(({ symbol, label, color }) => {
                const q = quotes[symbol];
                const up = (q?.changesPercentage ?? 0) >= 0;
                return (
                  <div key={symbol} onClick={() => onSelect(symbol)}
                    className="rounded p-2.5 cursor-pointer hover:bg-[#0d0d0d] transition-colors border"
                    style={{ borderColor: '#1a1a1a', background: '#050505' }}
                  >
                    <div className="text-[8px] font-bold tracking-widest mb-1" style={{ color: '#4b5563' }}>{label}</div>
                    {loadingQ || !q ? (
                      <div className="h-4 w-16 rounded shimmer mb-1" />
                    ) : (
                      <>
                        <div className="text-[14px] font-black font-mono" style={{ color }}>
                          ${fmtPrice(q.price)}
                        </div>
                        <div className="text-[10px] font-bold flex items-center gap-0.5 mt-0.5"
                          style={{ color: up ? '#22c55e' : '#ef4444' }}
                        >
                          {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                          {fmtPct(q.changesPercentage)}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Popular stocks */}
            <div className="mb-1 text-[9px] font-black tracking-[0.2em]" style={{ color: '#374151' }}>POPULAR STOCKS</div>
            <div className="space-y-px">
              {POPULAR_STOCKS.map(({ symbol, sector }) => {
                const q = quotes[symbol];
                const up = (q?.changesPercentage ?? 0) >= 0;
                return (
                  <div key={symbol} onClick={() => onSelect(symbol)}
                    className="flex items-center justify-between px-3 py-2 rounded cursor-pointer hover:bg-[#0d0d0d] transition-colors border"
                    style={{ borderColor: '#0d0d0d', background: '#030303' }}
                  >
                    <div>
                      <span className="text-[11px] font-black" style={{ color: '#e2c97e' }}>{symbol}</span>
                      <span className="text-[9px] ml-2" style={{ color: '#374151' }}>{sector}</span>
                    </div>
                    {loadingQ || !q ? (
                      <div className="h-4 w-24 rounded shimmer" />
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono" style={{ color: '#c9b97a' }}>${fmtPrice(q.price)}</span>
                        <span className="text-[10px] font-mono font-bold w-16 text-right" style={{ color: up ? '#22c55e' : '#ef4444' }}>
                          {fmtPct(q.changesPercentage)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: News ──────────────────────────────────────── */}
          <div className="overflow-y-auto p-4" style={{ width: 340 }}>
            <div className="mb-3 text-[9px] font-black tracking-[0.2em]" style={{ color: '#374151' }}>MARKET NEWS</div>
            {loadingN ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 w-full rounded shimmer" />
                    <div className="h-3 w-4/5 rounded shimmer" />
                    <div className="h-2 w-1/3 rounded shimmer" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                {news.slice(0, 20).map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="block py-2.5 border-b hover:bg-[#0d0d0d] px-1 rounded transition-colors group"
                    style={{ borderColor: '#0d0d0d', textDecoration: 'none' }}
                  >
                    <p className="text-[11px] leading-snug font-medium mb-1 group-hover:text-[#7dd3fc] transition-colors" style={{ color: '#c9b97a' }}>
                      {item.headline}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold tracking-wide" style={{ color: '#4b5563' }}>
                        {item.source?.toUpperCase()}
                      </span>
                      <span className="text-[8px]" style={{ color: '#1f2937' }}>{fmtTime(item.datetime)}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
