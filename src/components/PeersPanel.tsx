'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

interface PeerQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
}

const fmtMCap = (v: number | null) => {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
};

export default function PeersPanel({ symbol, onSelectTicker }: { symbol: string; onSelectTicker: (s: string) => void }) {
  const [peers, setPeers] = useState<PeerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/finnhub/peers?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }

      const symbols: string[] = (data.peers || []).filter((s: string) => s !== symbol).slice(0, 10);
      if (!symbols.length) { setPeers([]); setLoading(false); return; }

      const quoteRes = await apiFetch(`/api/quote?symbol=${symbols.join(',')}`);
      const quoteData = await quoteRes.json();

      // quoteData might be single or try fetching individually
      const quotesArr = Array.isArray(quoteData) ? quoteData : [quoteData].filter(Boolean);
      const peerQuotes: PeerQuote[] = symbols.map(sym => {
        const q = quotesArr.find((x: { symbol: string }) => x?.symbol === sym);
        return {
          symbol: sym,
          name: q?.shortName || q?.longName || sym,
          price: q?.regularMarketPrice ?? null,
          change: q?.regularMarketChange ?? null,
          changePercent: q?.regularMarketChangePercent ?? null,
          marketCap: q?.marketCap ?? null,
        };
      });
      setPeers(peerQuotes);
    } catch { setError('Failed to load peers'); }
    finally { setLoading(false); }
  }, [symbol]);

  // Fetch peers symbols then individual quotes
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/finnhub/peers?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }

      const symbols: string[] = (data.peers || []).filter((s: string) => s !== symbol).slice(0, 8);
      if (!symbols.length) { setPeers([]); setLoading(false); return; }

      const results = await Promise.all(
        symbols.map(async (sym) => {
          try {
            const r = await apiFetch(`/api/quote?symbol=${sym}`);
            const q = await r.json();
            return {
              symbol: sym,
              name: q?.shortName || q?.longName || sym,
              price: q?.regularMarketPrice ?? null,
              change: q?.regularMarketChange ?? null,
              changePercent: q?.regularMarketChangePercent ?? null,
              marketCap: q?.marketCap ?? null,
            } as PeerQuote;
          } catch {
            return { symbol: sym, name: sym, price: null, change: null, changePercent: null, marketCap: null } as PeerQuote;
          }
        })
      );
      setPeers(results);
    } catch { setError('Failed to load peers'); }
    finally { setLoading(false); }
  }, [symbol]);

  void fetch;
  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <span className="text-[10px] font-bold tracking-widest" style={{ color: '#34d399' }}>PEERS · {symbol} COMPARABLE COMPANIES</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="text-[10px] font-bold" style={{ color: '#ef4444' }}>{error}</span>
            {error.includes('configured') && (
              <span className="text-[9px]" style={{ color: '#374151' }}>Add your Finnhub key in Settings ⚙</span>
            )}
          </div>
        ) : peers.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px]" style={{ color: '#374151' }}>NO PEERS FOUND</span>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-0 px-3 py-1 text-[9px] font-bold tracking-widest" style={{ color: '#374151', borderBottom: '1px solid #0d0d0d' }}>
              <span>SYMBOL</span>
              <span className="text-right">PRICE</span>
              <span className="text-right">CHG%</span>
              <span className="text-right">MKT CAP</span>
            </div>
            {peers.map((peer) => {
              const isUp = (peer.changePercent ?? 0) >= 0;
              const color = peer.changePercent == null ? '#6b7280' : isUp ? '#22c55e' : '#ef4444';
              return (
                <div
                  key={peer.symbol}
                  className="grid grid-cols-4 gap-0 px-3 py-2 hover:bg-[#0d0d0d] cursor-pointer border-b transition-colors"
                  style={{ borderColor: '#0d0d0d' }}
                  onClick={() => onSelectTicker(peer.symbol)}
                >
                  <div>
                    <div className="text-[11px] font-bold" style={{ color: '#e2c97e' }}>{peer.symbol}</div>
                    <div className="text-[9px] truncate max-w-20" style={{ color: '#4b5563' }}>{peer.name}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono" style={{ color: '#9ca3af' }}>
                      {peer.price != null ? `$${peer.price.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="text-right flex items-center justify-end gap-0.5">
                    {peer.changePercent != null && (
                      isUp ? <TrendingUp size={8} style={{ color }} /> : <TrendingDown size={8} style={{ color }} />
                    )}
                    <span className="text-[10px] font-bold font-mono" style={{ color }}>
                      {peer.changePercent != null ? `${isUp ? '+' : ''}${peer.changePercent.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono" style={{ color: '#6b7280' }}>{fmtMCap(peer.marketCap)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 py-1 border-t flex items-center gap-1 flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <ExternalLink size={9} style={{ color: '#374151' }} />
        <span className="text-[9px]" style={{ color: '#374151' }}>Click to select a peer as active ticker</span>
      </div>
    </div>
  );
}
