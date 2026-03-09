'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface Props {
  symbol: string;
  onSelectTicker: (s: string) => void;
}

interface PeerQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
  name: string;
}

function getHeatStyle(pct: number | null): { bg: string; color: string; border: string } {
  if (pct == null) return { bg: '#111', color: '#4b5563', border: '#1a1a1a' };
  if (pct >= 2)   return { bg: '#052e16', color: '#4ade80', border: '#16a34a' };
  if (pct >= 0.5) return { bg: '#0a1f11', color: '#86efac', border: '#166534' };
  if (pct >= 0)   return { bg: '#0d1a0e', color: '#86efac', border: '#14532d' };
  if (pct >= -0.5)return { bg: '#1a0d0d', color: '#fca5a5', border: '#7f1d1d' };
  if (pct >= -2)  return { bg: '#2d0f0f', color: '#f87171', border: '#991b1b' };
  return             { bg: '#3d0808', color: '#ef4444', border: '#b91c1c' };
}

export default function PeersBar({ symbol, onSelectTicker }: Props) {
  const [peers, setPeers]     = useState<PeerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpd, setLastUpd] = useState<Date | null>(null);

  const fetchPeers = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const pRes = await apiFetch(`/api/finnhub/peers?symbol=${symbol}`).then(r => r.json());
      const syms: string[] = (pRes.peers || []).filter((p: string) => p !== symbol).slice(0, 14);
      if (syms.length === 0) { setLoading(false); return; }
      const qRes = await apiFetch(`/api/quotes-batch?symbols=${syms.join(',')}`).then(r => r.json());
      setPeers(qRes.quotes || []);
      setLastUpd(new Date());
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => {
    fetchPeers();
    const iv = setInterval(fetchPeers, 60000);
    return () => clearInterval(iv);
  }, [fetchPeers]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 border-b flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: '#6b7280' }}>
          PEER COMPARISON — {symbol}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {['#b91c1c','#991b1b','#7f1d1d','#1c1c1c','#14532d','#166534','#052e16'].map((c, i) => (
                <div key={i} className="w-3 h-2 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[8px]" style={{ color: '#374151' }}>-2% … +2%</span>
          </div>
          <button onClick={fetchPeers} className="p-0.5 rounded hover:bg-[#1a1a1a]">
            <RefreshCw size={9} style={{ color: loading ? '#f5a623' : '#4b5563' }} className={loading ? 'animate-spin' : ''} />
          </button>
          {lastUpd && <span className="text-[8px] font-mono" style={{ color: '#1f2937' }}>UPD {lastUpd.toLocaleTimeString('en-US', { hour12: false })}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-1">
        {loading && peers.length === 0 ? (
          <div className="flex gap-1 h-full">
            {[...Array(10)].map((_, i) => <div key={i} className="flex-1 rounded shimmer" />)}
          </div>
        ) : peers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px]" style={{ color: '#1f2937' }}>NO PEER DATA</span>
          </div>
        ) : (() => {
          // Find the best performing peer to highlight
          const bestPeer = peers.reduce((best, p) =>
            p.changesPercentage > best.changesPercentage ? p : best, peers[0]);
          return (
          <div className="flex gap-1 h-full">
            {peers.map((p) => {
              const { bg, color, border } = getHeatStyle(p.changesPercentage);
              const up = p.changesPercentage >= 0;
              const isBest = p.symbol === bestPeer.symbol && p.changesPercentage > 0.5;
              return (
                <div key={p.symbol} onClick={() => onSelectTicker(p.symbol)}
                  className="flex-1 flex flex-col items-center justify-center rounded cursor-pointer hover:brightness-125 transition-all relative"
                  style={{ background: bg, border: `1px solid ${isBest ? '#22c55e' : border}`,
                    boxShadow: isBest ? '0 0 8px #22c55e33' : 'none' }}
                  title={`${p.name}: ${p.changesPercentage >= 0 ? '+' : ''}${p.changesPercentage?.toFixed(2)}%`}
                >
                  {isBest && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1 py-px rounded text-[6px] font-black whitespace-nowrap"
                      style={{ background: '#14532d', color: '#4ade80', border: '1px solid #16a34a' }}>
                      CONSIDER
                    </div>
                  )}
                  <span className="text-[9px] font-black tracking-wide" style={{ color: '#e2c97e' }}>{p.symbol}</span>
                  <div className="flex items-center gap-0.5 mt-0.5" style={{ color }}>
                    {up ? <TrendingUp size={7} /> : <TrendingDown size={7} />}
                    <span className="text-[9px] font-bold">{p.changesPercentage >= 0 ? '+' : ''}{p.changesPercentage?.toFixed(2)}%</span>
                  </div>
                  <span className="text-[8px] font-mono mt-0.5 opacity-70" style={{ color }}>
                    ${p.price >= 1000 ? p.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : p.price?.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
