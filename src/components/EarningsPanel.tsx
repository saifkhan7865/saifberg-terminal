'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react';
import { format, parseISO, isPast, isToday, isFuture } from 'date-fns';

interface Earning {
  symbol: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  hour: string;
  quarter: number;
  year: number;
}

const fmtRev = (v: number | null) => {
  if (v == null) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
};

const fmtEps = (v: number | null) => v == null ? '—' : `$${v.toFixed(2)}`;

interface Props { symbol: string; }

export default function EarningsPanel({ symbol }: Props) {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'reported'>('all');

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/finnhub/earnings?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setEarnings(data.earnings || []);
    } catch { setError('Failed to load earnings'); }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  // Sort newest first for reported, oldest first for upcoming
  const sorted = [...earnings].sort((a, b) => {
    try {
      return parseISO(b.date).getTime() - parseISO(a.date).getTime();
    } catch { return 0; }
  });

  const filtered = sorted.filter(e => {
    if (!e.date) return false;
    try {
      const d = parseISO(e.date);
      if (filter === 'upcoming') return isFuture(d) || isToday(d);
      if (filter === 'reported') return isPast(d) && !isToday(d);
      return true;
    } catch { return false; }
  });

  const upcoming = sorted.find(e => {
    try { return isFuture(parseISO(e.date)) || isToday(parseISO(e.date)); } catch { return false; }
  });

  const lastReported = sorted.find(e => {
    try { return isPast(parseISO(e.date)) && !isToday(parseISO(e.date)); } catch { return false; }
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#21262d' }}>
        <div className="flex items-center gap-2">
          <Calendar size={12} style={{ color: '#fbbf24' }} />
          <span className="text-[11px] font-bold tracking-widest" style={{ color: '#fbbf24' }}>
            {symbol} · EARNINGS HISTORY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {(['all', 'upcoming', 'reported'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider transition-all"
                style={{
                  background: filter === f ? '#fbbf2418' : 'transparent',
                  border: `1px solid ${filter === f ? '#fbbf24' : '#30363d'}`,
                  color: filter === f ? '#fbbf24' : '#6e7681',
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={fetchEarnings} className="p-0.5 rounded hover:bg-[#21262d]">
            <RefreshCw size={9} style={{ color: loading ? '#fbbf24' : '#484f58' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
            <span className="text-[11px] font-bold text-center" style={{ color: '#ef4444' }}>{error}</span>
            {error.includes('configured') && (
              <span className="text-[9px] text-center" style={{ color: '#6e7681' }}>Add your Finnhub key in Settings ⚙</span>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-[11px]" style={{ color: '#484f58' }}>NO EARNINGS DATA</span>
          </div>
        ) : (
          <>
            {/* Next / Last quick summary */}
            {filter === 'all' && (upcoming || lastReported) && (
              <div className="flex gap-3 px-4 py-3 border-b" style={{ borderColor: '#21262d' }}>
                {upcoming && (
                  <div className="flex-1 rounded p-3" style={{ background: '#fbbf2410', border: '1px solid #fbbf2430' }}>
                    <div className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#fbbf24' }}>NEXT REPORT</div>
                    <div className="text-[13px] font-black font-mono" style={{ color: '#e6edf3' }}>
                      {format(parseISO(upcoming.date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: '#8b949e' }}>
                      Q{upcoming.quarter} {upcoming.year} · {upcoming.hour === 'bmo' ? 'Before Open' : upcoming.hour === 'amc' ? 'After Close' : 'TBD'}
                    </div>
                    {upcoming.epsEstimate != null && (
                      <div className="text-[9px] mt-1" style={{ color: '#8b949e' }}>
                        Est. EPS: <span style={{ color: '#fbbf24' }}>{fmtEps(upcoming.epsEstimate)}</span>
                      </div>
                    )}
                  </div>
                )}
                {lastReported && (
                  <div className="flex-1 rounded p-3" style={{ background: '#1c2128', border: '1px solid #30363d' }}>
                    <div className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#8b949e' }}>LAST REPORT</div>
                    <div className="text-[13px] font-black font-mono" style={{ color: '#e6edf3' }}>
                      {format(parseISO(lastReported.date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: '#8b949e' }}>Q{lastReported.quarter} {lastReported.year}</div>
                    {lastReported.epsActual != null && lastReported.epsEstimate != null && (
                      <div className="flex items-center gap-1 mt-1">
                        {lastReported.epsActual >= lastReported.epsEstimate
                          ? <TrendingUp size={10} style={{ color: '#22c55e' }} />
                          : <TrendingDown size={10} style={{ color: '#ef4444' }} />
                        }
                        <span className="text-[9px]" style={{ color: lastReported.epsActual >= lastReported.epsEstimate ? '#22c55e' : '#ef4444' }}>
                          {fmtEps(lastReported.epsActual)} vs {fmtEps(lastReported.epsEstimate)} est.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            <div className="grid px-4 py-2 text-[9px] font-black tracking-widest border-b"
              style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr', color: '#484f58', borderColor: '#21262d' }}>
              <span>QUARTER</span>
              <span>DATE</span>
              <span className="text-right">EPS ACTUAL</span>
              <span className="text-right">EPS EST.</span>
              <span className="text-right">BEAT/MISS</span>
            </div>

            {filtered.map((e, i) => {
              const reported = e.epsActual != null;
              const beat = reported && e.epsEstimate != null && e.epsActual! >= e.epsEstimate;
              const surprise = reported && e.epsEstimate != null && e.epsEstimate !== 0
                ? ((e.epsActual! - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100
                : null;
              const isFut = (() => { try { return isFuture(parseISO(e.date)); } catch { return false; } })();

              return (
                <div key={i}
                  className="grid px-4 py-2.5 border-b transition-colors"
                  style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr', borderColor: '#21262d',
                    background: isFut ? '#fbbf2406' : 'transparent' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = '#1c2128')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = isFut ? '#fbbf2406' : 'transparent')}
                >
                  <div>
                    <span className="text-[10px] font-black" style={{ color: isFut ? '#fbbf24' : '#e6edf3' }}>
                      Q{e.quarter} {e.year}
                    </span>
                    {isFut && <div className="text-[8px] font-bold" style={{ color: '#fbbf2480' }}>UPCOMING</div>}
                  </div>
                  <span className="text-[10px] font-mono self-center" style={{ color: '#8b949e' }}>
                    {(() => { try { return format(parseISO(e.date), 'MMM d, yyyy'); } catch { return e.date; } })()}
                  </span>
                  <span className="text-[11px] font-black font-mono text-right self-center"
                    style={{ color: reported ? (beat ? '#22c55e' : '#ef4444') : '#484f58' }}>
                    {reported ? fmtEps(e.epsActual) : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-right self-center" style={{ color: '#6e7681' }}>
                    {fmtEps(e.epsEstimate)}
                  </span>
                  <div className="text-right self-center">
                    {surprise != null ? (
                      <span className="text-[10px] font-bold"
                        style={{ color: surprise >= 0 ? '#22c55e' : '#ef4444' }}>
                        {surprise >= 0 ? '+' : ''}{surprise.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: '#484f58' }}>—</span>
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
