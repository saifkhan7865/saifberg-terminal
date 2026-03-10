'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { RefreshCw, Zap } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface FlowItem {
  symbol: string;
  putCall: string;          // 'Call' | 'Put'
  strikePrice: number;
  expirationDate: string;
  volume: number;
  openInterest: number;
  totalPremium: number;
  type: string;             // 'sweep' | 'block' | etc.
  date?: string;
  side?: string;            // 'buy' | 'sell'
}

const fmtPremium = (v: number) => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtNum = (v: number) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${v}`;
};

interface Props {
  onSelect: (symbol: string) => void;
}

type FilterType = 'ALL' | 'CALL' | 'PUT';
type SortType = 'premium' | 'volume' | 'ratio';

export default function OptionsFlow({ onSelect }: Props) {
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [sort, setSort] = useState<SortType>('premium');

  const fetchFlow = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/fmp/options-flow');
      const data = await res.json();
      if (data.error) setError(data.error);
      else setFlows(data.flows || []);
    } catch { setError('Failed to load options flow'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFlow(); }, [fetchFlow]);

  const filtered = flows
    .filter(f => filter === 'ALL' || f.putCall?.toLowerCase() === filter.toLowerCase())
    .sort((a, b) => {
      if (sort === 'premium') return (b.totalPremium ?? 0) - (a.totalPremium ?? 0);
      if (sort === 'volume')  return (b.volume ?? 0) - (a.volume ?? 0);
      if (sort === 'ratio') {
        const ra = a.openInterest > 0 ? a.volume / a.openInterest : 0;
        const rb = b.openInterest > 0 ? b.volume / b.openInterest : 0;
        return rb - ra;
      }
      return 0;
    });

  const totalCalls = flows.filter(f => f.putCall?.toLowerCase() === 'call').length;
  const totalPuts  = flows.filter(f => f.putCall?.toLowerCase() === 'put').length;
  const callPct = flows.length > 0 ? Math.round((totalCalls / flows.length) * 100) : 0;
  const putPct  = flows.length > 0 ? Math.round((totalPuts  / flows.length) * 100) : 0;
  const callPremium = flows.filter(f => f.putCall?.toLowerCase() === 'call').reduce((s, f) => s + (f.totalPremium ?? 0), 0);
  const putPremium  = flows.filter(f => f.putCall?.toLowerCase() === 'put').reduce((s, f) => s + (f.totalPremium ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: '#21262d', background: '#161b22' }}>
        <div className="flex items-center gap-2">
          <Zap size={12} style={{ color: '#f472b6' }} />
          <span className="text-[11px] font-black tracking-widest" style={{ color: '#f472b6' }}>
            OPTIONS FLOW
          </span>
          <span className="text-[9px] font-medium" style={{ color: '#484f58' }}>
            unusual activity · sorted by {sort}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Call/Put filter */}
          <div className="flex gap-0.5">
            {(['ALL', 'CALL', 'PUT'] as FilterType[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2 py-0.5 rounded text-[9px] font-bold transition-all"
                style={{
                  background: filter === f ? (f === 'CALL' ? '#22c55e18' : f === 'PUT' ? '#ef444418' : '#f472b618') : 'transparent',
                  border: `1px solid ${filter === f ? (f === 'CALL' ? '#22c55e' : f === 'PUT' ? '#ef4444' : '#f472b6') : '#30363d'}`,
                  color: filter === f ? (f === 'CALL' ? '#22c55e' : f === 'PUT' ? '#ef4444' : '#f472b6') : '#6e7681',
                }}
              >{f}</button>
            ))}
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortType)}
            className="text-[9px] font-bold rounded px-1.5 py-0.5 outline-none"
            style={{ background: '#1c2128', border: '1px solid #30363d', color: '#8b949e' }}
          >
            <option value="premium">By Premium</option>
            <option value="volume">By Volume</option>
            <option value="ratio">By Vol/OI</option>
          </select>
          <button onClick={fetchFlow} className="p-0.5 rounded hover:bg-[#21262d]">
            <RefreshCw size={9} style={{ color: loading ? '#f472b6' : '#484f58' }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Call/Put sentiment bar */}
      {!loading && flows.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2.5 border-b" style={{ borderColor: '#21262d' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] font-black" style={{ color: '#22c55e' }}>CALLS {callPct}%</span>
                <span className="text-[9px] ml-1" style={{ color: '#484f58' }}>{fmtPremium(callPremium)}</span>
              </div>
              <div>
                <span className="text-[10px] font-black" style={{ color: '#ef4444' }}>PUTS {putPct}%</span>
                <span className="text-[9px] ml-1" style={{ color: '#484f58' }}>{fmtPremium(putPremium)}</span>
              </div>
            </div>
            <span className="text-[10px] font-black" style={{
              color: callPct > 55 ? '#22c55e' : putPct > 55 ? '#ef4444' : '#f5a623'
            }}>
              {callPct > 55 ? '⬆ BULLISH FLOW' : putPct > 55 ? '⬇ BEARISH FLOW' : '◆ NEUTRAL FLOW'}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1c2128' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${callPct}%`, background: 'linear-gradient(to right, #22c55e, #4ade80)' }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(10)].map((_, i) => <div key={i} className="h-12 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 p-6">
            <Zap size={24} style={{ color: '#484f58' }} />
            <div className="text-center">
              <div className="text-[11px] font-bold mb-1" style={{ color: '#ef4444' }}>
                {error.includes('configured') ? 'FMP API Key Required' : error}
              </div>
              <div className="text-[9px] leading-relaxed" style={{ color: '#6e7681' }}>
                Options flow data requires an FMP API key.<br />Add it in Settings ⚙ to unlock this feature.
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <span className="text-[11px]" style={{ color: '#484f58' }}>NO FLOW DATA</span>
            <span className="text-[9px]" style={{ color: '#30363d' }}>Try again during market hours</span>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid px-4 py-2 border-b text-[8px] font-black tracking-widest"
              style={{ gridTemplateColumns: '70px 50px 70px 80px 70px 70px 80px 60px', borderColor: '#21262d', color: '#484f58' }}>
              <span>TICKER</span>
              <span>TYPE</span>
              <span className="text-right">STRIKE</span>
              <span className="text-right">EXPIRY</span>
              <span className="text-right">VOLUME</span>
              <span className="text-right">OI</span>
              <span className="text-right">PREMIUM</span>
              <span className="text-right">FLOW</span>
            </div>

            {filtered.map((f, i) => {
              const isCall = f.putCall?.toLowerCase() === 'call';
              const typeColor = isCall ? '#22c55e' : '#ef4444';
              const ratio = f.openInterest > 0 ? (f.volume / f.openInterest) : 0;
              const isUnusual = ratio > 2;
              const isMassive = (f.totalPremium ?? 0) >= 1e6;

              let expiry = f.expirationDate || '';
              try {
                expiry = f.expirationDate
                  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(f.expirationDate))
                  : '—';
              } catch { /* keep raw */ }

              return (
                <div key={i}
                  className="grid px-4 py-2 border-b transition-colors cursor-pointer"
                  style={{
                    gridTemplateColumns: '70px 50px 70px 80px 70px 70px 80px 60px',
                    borderColor: '#21262d',
                    background: isMassive ? `${typeColor}06` : 'transparent',
                  }}
                  onClick={() => onSelect(f.symbol)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
                  onMouseLeave={e => (e.currentTarget.style.background = isMassive ? `${typeColor}06` : 'transparent')}
                >
                  <div className="flex items-center gap-1">
                    {isMassive && <span style={{ color: typeColor, fontSize: 8 }}>●</span>}
                    <span className="text-[11px] font-black" style={{ color: '#e2c97e' }}>{f.symbol}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black px-1 py-0.5 rounded"
                      style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40` }}>
                      {isCall ? 'C' : 'P'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-right self-center" style={{ color: '#e6edf3' }}>
                    ${f.strikePrice?.toFixed(0) ?? '—'}
                  </span>
                  <span className="text-[9px] font-mono text-right self-center" style={{ color: '#8b949e' }}>
                    {expiry}
                  </span>
                  <span className="text-[10px] font-mono text-right self-center" style={{ color: isUnusual ? '#fbbf24' : '#8b949e' }}>
                    {fmtNum(f.volume ?? 0)}
                  </span>
                  <span className="text-[9px] font-mono text-right self-center" style={{ color: '#6e7681' }}>
                    {fmtNum(f.openInterest ?? 0)}
                  </span>
                  <span className="text-[11px] font-black font-mono text-right self-center"
                    style={{ color: isMassive ? typeColor : '#e2c97e' }}>
                    {fmtPremium(f.totalPremium ?? 0)}
                  </span>
                  <div className="text-right self-center">
                    {f.type && (
                      <span className="text-[7px] font-black px-1 py-0.5 rounded tracking-wider"
                        style={{ background: '#21262d', color: '#6e7681', border: '1px solid #30363d' }}>
                        {f.type.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
