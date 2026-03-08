'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Calendar, RefreshCw } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

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
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
};

export default function EarningsPanel() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'reported'>('upcoming');

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/finnhub/earnings');
      const data = await res.json();
      if (data.error) setError(data.error);
      else setEarnings(data.earnings || []);
    } catch { setError('Failed to load earnings calendar'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const filtered = earnings.filter(e => {
    if (!e.date) return false;
    try {
      const d = parseISO(e.date);
      if (filter === 'upcoming') return !isPast(d) || isToday(d);
      if (filter === 'reported') return isPast(d) && !isToday(d);
      return true;
    } catch { return false; }
  }).slice(0, 60);

  const getDateLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return { label: 'TODAY', color: '#f5a623' };
      if (isTomorrow(d)) return { label: 'TOMORROW', color: '#fbbf24' };
      return { label: format(d, 'MMM dd'), color: '#6b7280' };
    } catch { return { label: dateStr, color: '#6b7280' }; }
  };

  const epsColor = (actual: number | null, estimate: number | null) => {
    if (actual == null || estimate == null) return '#9ca3af';
    return actual >= estimate ? '#22c55e' : '#ef4444';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-2">
          <Calendar size={11} style={{ color: '#fbbf24' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: '#fbbf24' }}>ERN · EARNINGS CALENDAR</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {(['upcoming', 'reported', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest transition-all"
                style={{
                  background: filter === f ? '#fbbf2418' : 'transparent',
                  border: `1px solid ${filter === f ? '#fbbf24' : '#1a1a1a'}`,
                  color: filter === f ? '#fbbf24' : '#374151',
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={fetchEarnings} className="p-0.5 rounded hover:bg-[#1a1a1a]">
            <RefreshCw size={9} style={{ color: loading ? '#fbbf24' : '#4b5563' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-1.5">
            {[...Array(12)].map((_, i) => <div key={i} className="h-9 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 p-4">
            <span className="text-[10px] font-bold text-center" style={{ color: '#ef4444' }}>{error}</span>
            {error.includes('configured') && (
              <span className="text-[9px] text-center" style={{ color: '#374151' }}>Add your Finnhub key in Settings ⚙</span>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px]" style={{ color: '#374151' }}>NO EARNINGS IN RANGE</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-0 px-3 py-1 text-[8px] font-bold tracking-widest border-b" style={{ color: '#374151', borderColor: '#0d0d0d' }}>
              <span>SYMBOL</span><span>DATE</span><span className="text-right">EPS ACT</span><span className="text-right">EPS EST</span><span className="text-right">REVENUE</span>
            </div>
            {filtered.map((e, i) => {
              const { label, color } = getDateLabel(e.date);
              const ec = epsColor(e.epsActual, e.epsEstimate);
              return (
                <div key={i} className="grid grid-cols-5 gap-0 px-3 py-1.5 border-b hover:bg-[#0d0d0d] transition-colors" style={{ borderColor: '#080808' }}>
                  <div>
                    <span className="text-[10px] font-bold" style={{ color: '#e2c97e' }}>{e.symbol}</span>
                    <div className="text-[8px]" style={{ color: '#374151' }}>Q{e.quarter} {e.year} {e.hour === 'bmo' ? '🌅' : e.hour === 'amc' ? '🌆' : ''}</div>
                  </div>
                  <span className="text-[10px] font-bold self-center" style={{ color }}>{label}</span>
                  <span className="text-[10px] font-mono text-right self-center" style={{ color: ec }}>
                    {e.epsActual != null ? `$${e.epsActual.toFixed(2)}` : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-right self-center" style={{ color: '#6b7280' }}>
                    {e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : '—'}
                  </span>
                  <span className="text-[9px] font-mono text-right self-center" style={{ color: '#4b5563' }}>
                    {fmtRev(e.revenueActual ?? e.revenueEstimate)}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
