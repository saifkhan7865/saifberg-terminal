'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiClient';

interface Props {
  symbol: string;
  onSelectTicker: (s: string) => void;
}

const fmt = (v: unknown, dec = 2) => v != null ? (+v as number).toFixed(dec) : '—';
const fmtPct = (v: unknown) => v != null ? `${((+v as number) * 100).toFixed(1)}%` : '—';
const fmtB = (v: unknown) => {
  if (v == null) return '—';
  const n = +v as number;
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};
const fmtPrice = (v: number | null | undefined) => {
  if (v == null) return '—';
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return v.toFixed(2);
};

const RATING_COLOR: Record<string, string> = {
  strongBuy: '#22c55e', buy: '#4ade80', hold: '#f5a623', sell: '#f87171', strongSell: '#ef4444',
};
const RATING_LABEL: Record<string, string> = {
  strongBuy: 'STRONG BUY', buy: 'BUY', hold: 'HOLD', sell: 'SELL', strongSell: 'STRONG SELL',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-black tracking-[0.2em] mb-2" style={{ color: '#484f58' }}>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function StockSidebar({ symbol, onSelectTicker }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fund, setFund] = useState<any>(null);
  const [peers, setPeers] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [peerQuotes, setPeerQuotes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setFund(null);
    setPeers([]);
    setPeerQuotes({});

    Promise.allSettled([
      apiFetch(`/api/fundamentals?symbol=${symbol}`).then(r => r.json()),
      apiFetch(`/api/finnhub/peers?symbol=${symbol}`).then(r => r.json()),
    ]).then(([fRes, pRes]) => {
      if (fRes.status === 'fulfilled') setFund(fRes.value);
      if (pRes.status === 'fulfilled') {
        const ps: string[] = (pRes.value.peers || []).filter((p: string) => p !== symbol).slice(0, 9);
        setPeers(ps);
        if (ps.length > 0) {
          apiFetch(`/api/quotes-batch?symbols=${ps.join(',')}`).then(r => r.json()).then(d => {
            const map: Record<string, unknown> = {};
            for (const q of (d.quotes || [])) map[(q as { symbol: string }).symbol] = q;
            setPeerQuotes(map);
          });
        }
      }
      setLoading(false);
    });
  }, [symbol]);

  const lo = fund?.fiftyTwoWeekLow as number | undefined;
  const hi = fund?.fiftyTwoWeekHigh as number | undefined;
  const pr = fund?.currentPrice ?? fund?.regularMarketPrice as number | undefined;
  const pos52 = lo && hi && pr ? Math.min(Math.max(((pr - lo) / (hi - lo)) * 100, 0), 100) : null;

  const ratingKey = fund?.recommendationKey as string | undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0d1117' }}>

      {/* ── Company Header ─────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#21262d', background: '#161b22' }}>
        {loading || !fund ? (
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-2.5 w-1/2 rounded shimmer" />
            <div className="h-2.5 w-2/3 rounded shimmer" />
          </div>
        ) : (
          <>
            <div className="text-[13px] font-black leading-tight" style={{ color: '#e2c97e' }}>
              {fund.shortName || fund.longName || symbol}
            </div>
            {fund.sector && (
              <div className="text-[10px] mt-1 font-medium" style={{ color: '#8b949e' }}>{fund.sector}</div>
            )}
            {fund.industry && (
              <div className="text-[9px] mt-0.5" style={{ color: '#6e7681' }}>{fund.industry}</div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Key Metrics ────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-3 border-b" style={{ borderColor: '#21262d' }}>
          <SectionLabel>KEY METRICS</SectionLabel>
          {loading ? (
            <div className="space-y-2.5">
              {[...Array(7)].map((_, i) => <div key={i} className="h-4 rounded shimmer" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'MKT CAP',    value: fmtB(fund.marketCap) },
                { label: 'P/E (TTM)',  value: fund.trailingPE != null ? `${fmt(fund.trailingPE, 1)}x` : '—' },
                { label: 'FWD P/E',   value: fund.forwardPE != null ? `${fmt(fund.forwardPE, 1)}x` : '—' },
                { label: 'EPS TTM',   value: fund.trailingEps != null ? `$${fmt(fund.trailingEps)}` : '—' },
                { label: 'BETA',      value: fmt(fund.beta) },
                { label: 'NET MARGIN',value: fmtPct(fund.profitMargins) },
                { label: 'DIV YIELD', value: fund.dividendYield != null ? `${((+fund.dividendYield) * 100).toFixed(2)}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[9px] font-medium" style={{ color: '#8b949e' }}>{label}</span>
                  <span className="text-[10px] font-black font-mono" style={{ color: value === '—' ? '#484f58' : '#e2c97e' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 52-Week Range ──────────────────────────────────────────── */}
        {!loading && lo && hi && (
          <div className="px-4 pt-3 pb-3 border-b" style={{ borderColor: '#21262d' }}>
            <SectionLabel>52-WEEK RANGE</SectionLabel>
            <div className="relative h-2 rounded-full overflow-visible mb-2" style={{ background: '#1c2128' }}>
              <div className="absolute inset-0 rounded-full"
                style={{ background: 'linear-gradient(to right, #7f1d1d, #1c2128 50%, #14532d)' }} />
              {pos52 != null && (
                <div className="absolute top-1/2 w-3 h-3 rounded-full border-2"
                  style={{ left: `${pos52}%`, transform: 'translate(-50%, -50%)', background: '#e2c97e', borderColor: '#0d1117', zIndex: 1 }} />
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] font-mono font-bold" style={{ color: '#ef4444' }}>${fmtPrice(lo)}</span>
              <span className="text-[9px] font-mono font-bold" style={{ color: '#22c55e' }}>${fmtPrice(hi)}</span>
            </div>
          </div>
        )}

        {/* ── Analyst Consensus ─────────────────────────────────────── */}
        {!loading && ratingKey && (
          <div className="px-4 pt-3 pb-3 border-b" style={{ borderColor: '#21262d' }}>
            <SectionLabel>ANALYST CONSENSUS</SectionLabel>
            <div className="text-[15px] font-black mb-2" style={{ color: RATING_COLOR[ratingKey] || '#f5a623' }}>
              {RATING_LABEL[ratingKey] || ratingKey.toUpperCase()}
            </div>
            <div className="space-y-1.5">
              {fund.targetMeanPrice != null && (
                <div className="flex justify-between">
                  <span className="text-[9px] font-medium" style={{ color: '#8b949e' }}>TARGET</span>
                  <span className="text-[10px] font-black font-mono" style={{ color: '#e2c97e' }}>${fmt(fund.targetMeanPrice)}</span>
                </div>
              )}
              {fund.numberOfAnalystOpinions != null && (
                <div className="flex justify-between">
                  <span className="text-[9px] font-medium" style={{ color: '#8b949e' }}>ANALYSTS</span>
                  <span className="text-[10px] font-mono" style={{ color: '#e6edf3' }}>{fund.numberOfAnalystOpinions}</span>
                </div>
              )}
              {(fund.analystBuy || fund.analystHold || fund.analystSell) && (
                <div className="flex gap-1.5 mt-1.5">
                  {fund.analystBuy && <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: '#052e1680', color: '#4ade80', border: '1px solid #14532d' }}>B {fund.analystBuy}</span>}
                  {fund.analystHold && <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: '#1c100080', color: '#f5a623', border: '1px solid #451a00' }}>H {fund.analystHold}</span>}
                  {fund.analystSell && <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: '#1f050580', color: '#f87171', border: '1px solid #7f1d1d' }}>S {fund.analystSell}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Peers ─────────────────────────────────────────────────── */}
        {peers.length > 0 && (
          <div className="px-4 pt-3 pb-3">
            <SectionLabel>PEERS</SectionLabel>
            <div>
              {peers.map(p => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const q = peerQuotes[p] as any;
                const up = (q?.changesPercentage ?? 0) >= 0;
                return (
                  <div key={p} onClick={() => onSelectTicker(p)}
                    className="flex items-center justify-between px-2 py-2 rounded cursor-pointer transition-colors border-b"
                    style={{ borderColor: '#21262d' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0"
                        style={{ background: '#1c2128', border: '1px solid #21262d' }}>
                        <img
                          src={`https://financialmodelingprep.com/image-stock/${p}.png`}
                          alt={p}
                          className="w-full h-full object-contain p-0.5"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <span className="text-[11px] font-black" style={{ color: '#e2c97e' }}>{p}</span>
                    </div>
                    <div className="text-right">
                      {q ? (
                        <>
                          <div className="text-[10px] font-bold font-mono" style={{ color: up ? '#22c55e' : '#ef4444' }}>
                            {up ? '+' : ''}{q.changesPercentage?.toFixed(2)}%
                          </div>
                          <div className="text-[9px] font-mono" style={{ color: '#8b949e' }}>
                            ${fmtPrice(q.price)}
                          </div>
                        </>
                      ) : (
                        <span className="text-[9px]" style={{ color: '#484f58' }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
