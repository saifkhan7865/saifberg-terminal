'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { Rocket, RefreshCw } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';

interface IPO {
  date: string;
  exchange: string;
  name: string;
  numberOfShares: number | null;
  price: string | null;
  status: string;
  symbol: string;
  totalSharesValue: number | null;
}

export default function IPOPanel() {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchIPOs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/finnhub/ipo');
      const data = await res.json();
      if (data.error) setError(data.error);
      else setIpos(data.ipos || []);
    } catch { setError('Failed to load IPO calendar'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchIPOs(); }, [fetchIPOs]);

  const getDateLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return { label: 'TODAY', color: '#f5a623' };
      if (isTomorrow(d)) return { label: 'TOMORROW', color: '#fbbf24' };
      return { label: format(d, 'MMM dd'), color: '#6b7280' };
    } catch { return { label: dateStr, color: '#6b7280' }; }
  };

  const fmtShares = (v: number | null) => {
    if (v == null) return '—';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    return v.toLocaleString();
  };

  const fmtVal = (v: number | null) => {
    if (v == null) return '—';
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  };

  const statusColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'priced': return '#22c55e';
      case 'filed': return '#38bdf8';
      case 'expected': return '#fbbf24';
      case 'withdrawn': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#21262d' }}>
        <div className="flex items-center gap-2">
          <Rocket size={11} style={{ color: '#f472b6' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: '#f472b6' }}>IPO · IPO CALENDAR</span>
        </div>
        <button onClick={fetchIPOs} className="p-0.5 rounded hover:bg-[#21262d]">
          <RefreshCw size={9} style={{ color: loading ? '#f472b6' : '#4b5563' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-1.5">
            {[...Array(10)].map((_, i) => <div key={i} className="h-10 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 p-4">
            <span className="text-[10px] font-bold text-center" style={{ color: '#ef4444' }}>{error}</span>
            {error.includes('configured') && (
              <span className="text-[9px] text-center" style={{ color: '#374151' }}>Add your Finnhub key in Settings ⚙</span>
            )}
          </div>
        ) : ipos.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px]" style={{ color: '#374151' }}>NO UPCOMING IPOS IN RANGE</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-0 px-3 py-1 text-[8px] font-bold tracking-widest border-b" style={{ color: '#374151', borderColor: '#1c2128' }}>
              <span className="col-span-2">COMPANY</span><span>DATE</span><span className="text-right">PRICE</span><span className="text-right">VALUE</span>
            </div>
            {ipos.map((ipo, i) => {
              const { label, color } = getDateLabel(ipo.date);
              return (
                <div key={i} className="grid grid-cols-5 gap-0 px-3 py-1.5 border-b hover:bg-[#1c2128] transition-colors" style={{ borderColor: '#161b22' }}>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold truncate" style={{ color: '#f472b6' }}>{ipo.symbol || '—'}</div>
                    <div className="text-[8px] truncate" style={{ color: '#374151' }}>{ipo.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold" style={{ color }}>{label}</div>
                    <div className="text-[8px]" style={{ color: statusColor(ipo.status) }}>{ipo.status?.toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono" style={{ color: '#e2c97e' }}>
                      {ipo.price ? `$${ipo.price}` : '—'}
                    </div>
                    <div className="text-[8px] font-mono" style={{ color: '#4b5563' }}>{fmtShares(ipo.numberOfShares)} shs</div>
                  </div>
                  <div className="text-right self-center">
                    <span className="text-[9px] font-mono" style={{ color: '#6b7280' }}>{fmtVal(ipo.totalSharesValue)}</span>
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
