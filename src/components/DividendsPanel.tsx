'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { DollarSign, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Dividend {
  date: string;
  label: string;
  adjDividend: number;
  dividend: number;
  recordDate: string;
  paymentDate: string;
  declarationDate: string;
}

interface Props {
  symbol: string;
}

export default function DividendsPanel({ symbol }: Props) {
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDividends = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/fmp/dividends?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDividends(data.dividends || []);
    } catch { setError('Failed to load dividend data'); }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { fetchDividends(); }, [fetchDividends]);

  const fmtDate = (s: string) => {
    if (!s) return '—';
    try { return format(parseISO(s), 'MMM dd, yyyy'); } catch { return s; }
  };

  const totalAnnual = dividends
    .filter(d => {
      try { return new Date(d.date).getFullYear() === new Date().getFullYear() - 1; } catch { return false; }
    })
    .reduce((sum, d) => sum + (d.dividend || 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-2">
          <DollarSign size={11} style={{ color: '#4ade80' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: '#4ade80' }}>DVD · DIVIDENDS — {symbol}</span>
        </div>
        <button onClick={fetchDividends} className="p-0.5 rounded hover:bg-[#1a1a1a]">
          <RefreshCw size={9} style={{ color: loading ? '#4ade80' : '#4b5563' }} />
        </button>
      </div>

      {!loading && !error && dividends.length > 0 && (
        <div className="flex gap-4 px-3 py-2 border-b flex-shrink-0" style={{ borderColor: '#0d0d0d' }}>
          <div>
            <div className="text-[8px] font-bold tracking-widest" style={{ color: '#374151' }}>MOST RECENT</div>
            <div className="text-[14px] font-bold font-mono" style={{ color: '#4ade80' }}>
              ${dividends[0].dividend.toFixed(4)}
            </div>
          </div>
          {totalAnnual > 0 && (
            <div>
              <div className="text-[8px] font-bold tracking-widest" style={{ color: '#374151' }}>ANNUAL ({new Date().getFullYear() - 1})</div>
              <div className="text-[14px] font-bold font-mono" style={{ color: '#e2c97e' }}>
                ${totalAnnual.toFixed(4)}
              </div>
            </div>
          )}
          <div>
            <div className="text-[8px] font-bold tracking-widest" style={{ color: '#374151' }}>FREQUENCY</div>
            <div className="text-[11px] font-bold" style={{ color: '#6b7280' }}>
              {dividends.length >= 4 ? 'QUARTERLY' : dividends.length >= 2 ? 'SEMI-ANN' : 'ANNUAL'}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-1.5">
            {[...Array(10)].map((_, i) => <div key={i} className="h-9 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 p-4">
            <span className="text-[10px] font-bold text-center" style={{ color: '#ef4444' }}>{error}</span>
            {error.includes('configured') && (
              <span className="text-[9px] text-center" style={{ color: '#374151' }}>Add your FMP key in Settings ⚙</span>
            )}
          </div>
        ) : dividends.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px]" style={{ color: '#374151' }}>NO DIVIDEND HISTORY — {symbol} may not pay dividends</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-0 px-3 py-1 text-[8px] font-bold tracking-widest border-b" style={{ color: '#374151', borderColor: '#0d0d0d' }}>
              <span>EX-DATE</span><span className="text-right">AMOUNT</span><span className="text-right">PAY DATE</span><span className="text-right">REC DATE</span>
            </div>
            {dividends.slice(0, 50).map((d, i) => (
              <div key={i} className="grid grid-cols-4 gap-0 px-3 py-1.5 border-b hover:bg-[#0d0d0d] transition-colors" style={{ borderColor: '#080808' }}>
                <span className="text-[10px] font-mono" style={{ color: '#e2c97e' }}>{fmtDate(d.date)}</span>
                <span className="text-[10px] font-mono font-bold text-right" style={{ color: '#4ade80' }}>
                  ${d.dividend.toFixed(4)}
                </span>
                <span className="text-[9px] font-mono text-right" style={{ color: '#6b7280' }}>{fmtDate(d.paymentDate)}</span>
                <span className="text-[9px] font-mono text-right" style={{ color: '#4b5563' }}>{fmtDate(d.recordDate)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
