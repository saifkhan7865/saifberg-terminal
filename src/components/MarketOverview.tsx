'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
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

interface Props {
  onSelectTicker: (symbol: string) => void;
}

const INDICES = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'GLD', 'USO'];
const INDEX_NAMES: Record<string, string> = {
  SPY: 'S&P 500',
  QQQ: 'Nasdaq 100',
  DIA: 'Dow Jones',
  IWM: 'Russell 2K',
  VIX: 'Volatility',
  GLD: 'Gold',
  USO: 'Oil',
};

const MEGACAP = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA'];
const CRYPTO  = ['BTC-USD', 'ETH-USD', 'SOL-USD'];

const fmtPrice = (v: number) => {
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1000)  return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return v.toFixed(2);
};
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtMCap = (v?: number) => {
  if (!v) return '';
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `${(v / 1e9).toFixed(0)}B`;
  return `${(v / 1e6).toFixed(0)}M`;
};

function QuoteRow({ q, onSelect, showMCap = false }: { q: QuoteMini; onSelect: () => void; showMCap?: boolean }) {
  const up = q.changesPercentage >= 0;
  const color = up ? '#22c55e' : '#ef4444';
  const barW = Math.min(Math.abs(q.changesPercentage) * 10, 100);

  return (
    <div
      onClick={onSelect}
      className="relative px-3 py-2 cursor-pointer hover:bg-[#0d0d0d] transition-colors border-b overflow-hidden"
      style={{ borderColor: '#0a0a0a' }}
    >
      {/* Change bar background */}
      <div
        className="absolute left-0 top-0 bottom-0 opacity-[0.04]"
        style={{ width: `${barW}%`, background: color }}
      />

      <div className="relative flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black" style={{ color: '#e2c97e' }}>{q.symbol.replace('-USD', '')}</span>
            {showMCap && q.marketCap && (
              <span className="text-[8px] font-bold px-1 rounded" style={{ background: '#111', color: '#374151' }}>
                {fmtMCap(q.marketCap)}
              </span>
            )}
          </div>
          <div className="text-[8px] truncate max-w-[110px]" style={{ color: '#374151' }}>
            {INDEX_NAMES[q.symbol] || q.name || q.symbol}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[11px] font-mono font-bold" style={{ color: '#c9b97a' }}>
            ${fmtPrice(q.price)}
          </div>
          <div className="text-[9px] font-mono font-bold flex items-center gap-0.5 justify-end" style={{ color }}>
            {up ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
            {fmtPct(q.changesPercentage)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, color, children, onRefresh, loading }: {
  title: string; color: string; children: React.ReactNode; onRefresh?: () => void; loading?: boolean;
}) {
  return (
    <div className="border-b" style={{ borderColor: '#1a1a1a' }}>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[9px] font-black tracking-[0.2em]" style={{ color }}>{title}</span>
        {onRefresh && (
          <button onClick={onRefresh} className="p-0.5 rounded hover:bg-[#1a1a1a]">
            <RefreshCw size={8} style={{ color: loading ? color : '#2a2a2a' }} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-px px-3 pb-1">
      {[...Array(count)].map((_, i) => <div key={i} className="h-9 rounded shimmer" />)}
    </div>
  );
}

export default function MarketOverview({ onSelectTicker }: Props) {
  const [indicesData, setIndicesData]   = useState<QuoteMini[]>([]);
  const [megacapData, setMegacapData]   = useState<QuoteMini[]>([]);
  const [cryptoData,  setCryptoData]    = useState<QuoteMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBatch = useCallback(async (symbols: string[]): Promise<QuoteMini[]> => {
    try {
      const res = await apiFetch(`/api/quotes-batch?symbols=${symbols.join(',')}`);
      const data = await res.json();
      const map: Record<string, QuoteMini> = {};
      for (const q of (data.quotes || [])) map[q.symbol] = q;
      // Return in original order
      return symbols.map(s => map[s]).filter(Boolean);
    } catch { return []; }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [idx, mega, crypto] = await Promise.all([
      fetchBatch(INDICES),
      fetchBatch(MEGACAP),
      fetchBatch(CRYPTO),
    ]);
    setIndicesData(idx);
    setMegacapData(mega);
    setCryptoData(crypto);
    setLastUpdated(new Date());
    setLoading(false);
  }, [fetchBatch]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto flex-1">

        {/* INDICES */}
        <Section title="INDICES" color="#f5a623" onRefresh={fetchAll} loading={loading}>
          {loading && indicesData.length === 0 ? <SkeletonRows count={5} /> : (
            indicesData.map(q => (
              <QuoteRow key={q.symbol} q={q} onSelect={() => onSelectTicker(q.symbol)} />
            ))
          )}
        </Section>

        {/* MEGA CAP */}
        <Section title="MEGA CAP" color="#e2c97e">
          {loading && megacapData.length === 0 ? <SkeletonRows count={5} /> : (
            megacapData.map(q => (
              <QuoteRow key={q.symbol} q={q} onSelect={() => onSelectTicker(q.symbol)} showMCap />
            ))
          )}
        </Section>

        {/* CRYPTO */}
        <Section title="CRYPTO" color="#a78bfa">
          {loading && cryptoData.length === 0 ? <SkeletonRows count={3} /> : (
            cryptoData.map(q => (
              <QuoteRow key={q.symbol} q={q} onSelect={() => onSelectTicker(q.symbol)} />
            ))
          )}
        </Section>

      </div>

      {lastUpdated && (
        <div className="px-3 py-1 border-t text-[8px] font-mono" style={{ borderColor: '#0d0d0d', color: '#1f2937' }}>
          UPD {lastUpdated.toLocaleTimeString('en-US', { hour12: false })}
        </div>
      )}
    </div>
  );
}
