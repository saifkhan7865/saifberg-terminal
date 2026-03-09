'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

interface QuoteMini {
  symbol: string;
  price: number;
  changesPercentage: number;
  change: number;
  name: string;
  marketCap?: number;
  volume?: number;
}

interface Mover {
  symbol: string;
  shortName: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
}

interface Props {
  onSelectTicker: (symbol: string) => void;
}

const INDEX_SYMS = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'GLD'];
const INDEX_LABELS: Record<string, string> = {
  SPY: 'S&P 500', QQQ: 'Nasdaq', DIA: 'Dow', IWM: 'Russell', VIX: 'VIX', GLD: 'Gold',
};

const fmtPrice = (v: number | null) => {
  if (v == null) return '—';
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1000)  return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return v.toFixed(2);
};
const fmtPct = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtVol = (v: number | null) => {
  if (v == null) return '';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
};

type Tab = 'gainers' | 'losers' | 'actives';

export default function MarketOverview({ onSelectTicker }: Props) {
  const [indices, setIndices]   = useState<QuoteMini[]>([]);
  const [gainers, setGainers]   = useState<Mover[]>([]);
  const [losers,  setLosers]    = useState<Mover[]>([]);
  const [actives, setActives]   = useState<Mover[]>([]);
  const [tab, setTab]           = useState<Tab>('gainers');
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [idxRes, marketRes] = await Promise.allSettled([
        apiFetch(`/api/quotes-batch?symbols=${INDEX_SYMS.join(',')}`).then(r => r.json()),
        apiFetch('/api/market').then(r => r.json()),
      ]);

      if (idxRes.status === 'fulfilled') {
        const map: Record<string, QuoteMini> = {};
        for (const q of (idxRes.value.quotes || [])) map[q.symbol] = q;
        setIndices(INDEX_SYMS.map(s => map[s]).filter(Boolean));
      }
      if (marketRes.status === 'fulfilled') {
        const d = marketRes.value;
        setGainers(d.gainers || []);
        setLosers(d.losers  || []);
        setActives(d.actives || []);
      }
      setLastUpdated(new Date());
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const movers = tab === 'gainers' ? gainers : tab === 'losers' ? losers : actives;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Index tiles ─────────────────────────────────────── */}
      <div className="flex-shrink-0 px-2 pt-2 pb-1 border-b" style={{ borderColor: '#111' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-black tracking-[0.18em]" style={{ color: '#374151' }}>INDICES</span>
          <button onClick={fetchAll} className="p-0.5 rounded hover:bg-[#111]">
            <RefreshCw size={8} style={{ color: loading ? '#f5a623' : '#2a2a2a' }} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {loading && indices.length === 0
            ? [...Array(6)].map((_, i) => <div key={i} className="h-10 rounded shimmer" />)
            : indices.map(q => {
                const up = q.changesPercentage >= 0;
                const c  = up ? '#22c55e' : '#ef4444';
                return (
                  <div key={q.symbol} onClick={() => onSelectTicker(q.symbol)}
                    className="rounded px-2 py-1.5 cursor-pointer hover:bg-[#111] transition-colors border"
                    style={{ borderColor: '#111', background: '#050505' }}
                  >
                    <div className="text-[8px] font-bold" style={{ color: '#4b5563' }}>{INDEX_LABELS[q.symbol]}</div>
                    <div className="text-[11px] font-black font-mono" style={{ color: '#c9b97a' }}>
                      ${fmtPrice(q.price)}
                    </div>
                    <div className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: c }}>
                      {up ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                      {fmtPct(q.changesPercentage)}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── Movers tabs ─────────────────────────────────────── */}
      <div className="flex-shrink-0 flex border-b" style={{ borderColor: '#111' }}>
        {(['gainers', 'losers', 'actives'] as Tab[]).map(t => {
          const colors: Record<Tab, string> = { gainers: '#22c55e', losers: '#ef4444', actives: '#f5a623' };
          const labels: Record<Tab, string> = { gainers: '▲ TOP', losers: '▼ BOT', actives: '⊙ ACT' };
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 text-[8px] font-black tracking-widest transition-all"
              style={{
                borderBottom: `2px solid ${active ? colors[t] : 'transparent'}`,
                color: active ? colors[t] : '#2a2a2a',
                background: active ? `${colors[t]}08` : 'transparent',
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ── Movers list ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading && movers.length === 0 ? (
          <div className="p-2 space-y-1">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 rounded shimmer" />)}
          </div>
        ) : movers.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-[9px]" style={{ color: '#1f2937' }}>NO DATA</span>
          </div>
        ) : (
          movers.map((m) => {
            const up = (m.changePercent ?? 0) >= 0;
            const c  = up ? '#22c55e' : '#ef4444';
            const barW = Math.min(Math.abs(m.changePercent ?? 0) * 8, 100);
            return (
              <div key={m.symbol} onClick={() => onSelectTicker(m.symbol)}
                className="relative px-2 py-2 cursor-pointer hover:bg-[#0d0d0d] transition-colors border-b overflow-hidden"
                style={{ borderColor: '#080808' }}
              >
                <div className="absolute inset-y-0 left-0 opacity-[0.05]"
                  style={{ width: `${barW}%`, background: c }} />
                <div className="relative flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[11px] font-black" style={{ color: '#e2c97e' }}>{m.symbol}</span>
                    <div className="text-[8px] truncate max-w-[80px]" style={{ color: '#374151' }}>
                      {m.shortName}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] font-mono font-bold" style={{ color: c }}>
                      {fmtPct(m.changePercent)}
                    </div>
                    <div className="text-[9px] font-mono" style={{ color: '#4b5563' }}>
                      ${fmtPrice(m.price)}
                    </div>
                    {m.volume && (
                      <div className="text-[8px] flex items-center gap-0.5 justify-end" style={{ color: '#1f2937' }}>
                        <Activity size={7} />{fmtVol(m.volume)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {lastUpdated && (
        <div className="px-2 py-1 border-t text-[8px] font-mono" style={{ borderColor: '#0a0a0a', color: '#1f2937' }}>
          UPD {lastUpdated.toLocaleTimeString('en-US', { hour12: false })}
        </div>
      )}
    </div>
  );
}
