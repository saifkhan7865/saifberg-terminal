'use client';

import { useState, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

const SECTORS = [
  'Technology', 'Financial Services', 'Energy', 'Healthcare',
  'Industrials', 'Consumer Defensive', 'Consumer Cyclical',
  'Real Estate', 'Basic Materials', 'Communication Services', 'Utilities',
];

interface ScreenerStock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  price: number;
  beta: number;
  volume: number;
  industry: string;
}

interface Props {
  onSelect: (symbol: string) => void;
}

const fmtB = (v: number) => {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
};

const fmtVol = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${v}`;
};

type SortKey = 'marketCap' | 'volume' | 'beta';

export default function StockScreener({ onSelect }: Props) {
  const [sector,  setSector]  = useState('');
  const [marketCap, setMarketCap] = useState('1B');
  const [sortBy,  setSortBy]  = useState<SortKey>('marketCap');
  const [stocks,  setStocks]  = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error,   setError]   = useState('');

  const scan = useCallback(async () => {
    if (!sector) { setError('Please select a sector'); return; }
    setLoading(true);
    setError('');
    setScanned(false);
    try {
      const capMap: Record<string, number> = { '1B': 1_000_000_000, '10B': 10_000_000_000, '100B': 100_000_000_000 };
      const capParam = capMap[marketCap] ?? 1_000_000_000;

      const res  = await apiFetch(`/api/fmp/sector-stocks?sector=${encodeURIComponent(sector)}&marketCapMoreThan=${capParam}`);
      const data = await res.json() as { stocks?: ScreenerStock[]; error?: string };

      if (data.error) { setError(data.error); setStocks([]); }
      else {
        let s = data.stocks || [];
        if      (sortBy === 'marketCap') s = [...s].sort((a, b) => b.marketCap - a.marketCap);
        else if (sortBy === 'volume')    s = [...s].sort((a, b) => b.volume    - a.volume);
        else if (sortBy === 'beta')      s = [...s].sort((a, b) => b.beta      - a.beta);
        setStocks(s);
        setScanned(true);
      }
    } catch { setError('Scan failed'); }
    finally { setLoading(false); }
  }, [sector, marketCap, sortBy]);

  const selectStyle = {
    background: '#0a0a0a',
    border: '1px solid #1f1f1f',
    color: '#9ca3af',
    fontSize: 10,
    padding: '4px 8px',
    borderRadius: 4,
    outline: 'none',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#000' }}>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: '#111', background: '#020202' }}>
        <span className="text-[8px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>SCREENER</span>

        <select value={sector} onChange={e => setSector(e.target.value)} style={selectStyle}>
          <option value="">Select Sector</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={marketCap} onChange={e => setMarketCap(e.target.value)} style={selectStyle}>
          <option value="any">Any Mkt Cap</option>
          <option value="1B">Market Cap &gt;$1B</option>
          <option value="10B">Market Cap &gt;$10B</option>
          <option value="100B">Market Cap &gt;$100B</option>
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={selectStyle}>
          <option value="marketCap">Sort: Mkt Cap</option>
          <option value="volume">Sort: Volume</option>
          <option value="beta">Sort: Beta</option>
        </select>

        <button
          onClick={scan}
          disabled={loading || !sector}
          className="px-4 py-1 rounded text-[9px] font-black tracking-widest disabled:opacity-40 transition-all"
          style={{
            background: '#1a0f00',
            border: '1px solid #f5a623',
            color: '#f5a623',
          }}
        >
          {loading ? 'SCANNING...' : 'SCAN'}
        </button>

        {error && <span className="text-[8px]" style={{ color: '#ef4444' }}>{error}</span>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(12)].map((_, i) => <div key={i} className="h-10 rounded shimmer" />)}
          </div>
        ) : !scanned ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-[32px]" style={{ color: '#111' }}>⊙</div>
            <div className="text-center">
              <div className="text-[11px] font-black mb-1" style={{ color: '#2a2a2a' }}>STOCK SCREENER</div>
              <p className="text-[9px]" style={{ color: '#1f2937' }}>Select a sector and click SCAN to screen stocks</p>
            </div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px]" style={{ color: '#1f2937' }}>No results for selected filters</span>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="flex items-center px-4 py-1.5 border-b sticky top-0"
              style={{ background: '#030303', borderColor: '#0a0a0a' }}>
              <div className="w-8 text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>#</div>
              <div className="flex-1 text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>SYMBOL / COMPANY</div>
              <div className="w-36 text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>SECTOR</div>
              <div className="w-28 text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>MKT CAP</div>
              <div className="w-20 text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>PRICE</div>
              <div className="w-16 text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>BETA</div>
              <div className="w-20 text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>VOLUME</div>
            </div>

            {stocks.map((s, i) => (
              <div key={s.symbol}
                onClick={() => onSelect(s.symbol)}
                className="flex items-center px-4 py-2.5 cursor-pointer hover:bg-[#080808] transition-colors border-b"
                style={{ borderColor: '#050505' }}
              >
                <div className="w-8 text-[9px] font-mono" style={{ color: '#1f2937' }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black leading-none" style={{ color: '#e2c97e' }}>{s.symbol}</div>
                  <div className="text-[8px] truncate max-w-[220px] mt-0.5" style={{ color: '#374151' }}>
                    {s.name || s.industry}
                  </div>
                </div>
                <div className="w-36">
                  <span className="text-[8px] truncate" style={{ color: '#4b5563' }}>{s.sector}</span>
                </div>
                <div className="w-28 text-right">
                  <span className="text-[10px] font-mono font-bold" style={{ color: '#c9b97a' }}>
                    {fmtB(s.marketCap)}
                  </span>
                </div>
                <div className="w-20 text-right">
                  <span className="text-[10px] font-mono" style={{ color: '#9ca3af' }}>
                    ${s.price?.toFixed(2) ?? '—'}
                  </span>
                </div>
                <div className="w-16 text-right">
                  <span className="text-[9px] font-mono"
                    style={{ color: s.beta > 1.5 ? '#f87171' : s.beta > 1 ? '#fbbf24' : '#4ade80' }}>
                    {s.beta?.toFixed(2) ?? '—'}
                  </span>
                </div>
                <div className="w-20 text-right flex items-center justify-end gap-0.5"
                  style={{ color: '#374151' }}>
                  <Activity size={8} />
                  <span className="text-[9px]">{fmtVol(s.volume)}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
