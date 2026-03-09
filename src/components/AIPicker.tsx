'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const SECTORS = [
  'Technology', 'Financial Services', 'Energy', 'Healthcare',
  'Industrials', 'Consumer Defensive', 'Consumer Cyclical',
  'Real Estate', 'Basic Materials', 'Communication Services', 'Utilities',
];

type Risk    = 'low' | 'medium' | 'high';
type Horizon = 'short' | 'medium' | 'long';

interface StockRec {
  ticker: string;
  name: string;
  reason: string;
  risk: string;
}

interface Recommendation {
  sector: string;
  sectorReason: string;
  etf: string;
  etfReason: string;
  stocks: StockRec[];
  timing: string;
  summary: string;
}

interface Props {
  onSelect: (symbol: string) => void;
  sectors?: string[];
}

export default function AIPicker({ onSelect }: Props) {
  const [step,    setStep]    = useState(1);
  const [horizon, setHorizon] = useState<Horizon | null>(null);
  const [risk,    setRisk]    = useState<Risk | null>(null);
  const [sector,  setSector]  = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Recommendation | null>(null);
  const [error,   setError]   = useState('');

  const reset = () => {
    setStep(1); setHorizon(null); setRisk(null);
    setSector(null); setResult(null); setError('');
  };

  const analyze = async () => {
    if (!horizon || !risk) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/ai-pick-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk, horizon, sector: sector || 'any', sectors: SECTORS, budget: 'any' }),
      });
      const data = await res.json() as { recommendation?: Recommendation; error?: string };
      if (data.error) setError(data.error);
      else setResult(data.recommendation || null);
    } catch { setError('AI analysis failed'); }
    finally { setLoading(false); }
  };

  const cardBase = {
    border: '1px solid #1f1f1f',
    background: '#060606',
    cursor: 'pointer',
    transition: 'all 0.15s',
    borderRadius: 8,
    padding: '14px 16px',
  };

  const cardActive = {
    border: '1px solid #f5a623',
    background: '#0f0a00',
  };

  const riskActive = {
    border: '1px solid #a78bfa',
    background: '#0d0820',
  };

  const sectorActive = {
    border: '1px solid #38bdf8',
    background: '#010d1a',
  };

  const riskColor = (r: Risk) =>
    r === 'low' ? '#22c55e' : r === 'medium' ? '#f5a623' : '#ef4444';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-3 h-3 rounded-full pulse-live" style={{ background: '#a78bfa' }} />
        <div className="text-[11px] font-black" style={{ color: '#a78bfa' }}>ANALYZING FOR YOU...</div>
        <div className="space-y-2 w-64">
          {[90, 75, 85, 65, 80].map((w, i) => (
            <div key={i} className="h-3 rounded shimmer" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="p-6 overflow-y-auto h-full space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-black tracking-[0.2em]" style={{ color: '#a78bfa' }}>
            ✦ AI STOCK RECOMMENDATION
          </div>
          <button onClick={reset} className="text-[8px] font-bold px-2 py-1 rounded hover:opacity-70"
            style={{ border: '1px solid #1f2937', color: '#4b5563' }}>
            START OVER
          </button>
        </div>

        {/* Summary banner */}
        {result.summary && (
          <div className="p-4 rounded" style={{ background: '#0d0820', border: '1px solid #4c1d95' }}>
            <p className="text-[10px] leading-relaxed" style={{ color: '#c4b5fd' }}>{result.summary}</p>
          </div>
        )}

        {/* Sector + ETF row */}
        <div className="flex gap-3">
          {result.sector && (
            <div className="flex-1 p-4 rounded" style={{ background: '#010d1a', border: '1px solid #0c4a6e' }}>
              <div className="text-[7px] font-black tracking-widest mb-1" style={{ color: '#38bdf8' }}>RECOMMENDED SECTOR</div>
              <div className="text-[16px] font-black mb-1" style={{ color: '#38bdf8' }}>{result.sector}</div>
              <p className="text-[9px] leading-snug" style={{ color: '#7dd3fc' }}>{result.sectorReason}</p>
            </div>
          )}
          {result.etf && (
            <div className="flex-1 p-4 rounded cursor-pointer hover:brightness-125 transition-all"
              style={{ background: '#020f02', border: '1px solid #14532d' }}
              onClick={() => onSelect(result.etf)}
            >
              <div className="text-[7px] font-black tracking-widest mb-1" style={{ color: '#22c55e' }}>TOP ETF</div>
              <div className="text-[20px] font-black mb-1" style={{ color: '#4ade80' }}>{result.etf}</div>
              <p className="text-[9px] leading-snug" style={{ color: '#86efac' }}>{result.etfReason}</p>
            </div>
          )}
        </div>

        {/* Timing */}
        {result.timing && (
          <div className="p-3 rounded flex items-start gap-2" style={{ background: '#080600', border: '1px solid #1c1000' }}>
            <span className="text-[9px] font-black flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }}>⏱</span>
            <div>
              <div className="text-[7px] font-black tracking-widest mb-0.5" style={{ color: '#78350f' }}>TIMING</div>
              <p className="text-[9px] leading-snug" style={{ color: '#fcd34d' }}>{result.timing}</p>
            </div>
          </div>
        )}

        {/* Stocks */}
        {result.stocks.length > 0 && (
          <div>
            <div className="text-[8px] font-black tracking-[0.2em] mb-2" style={{ color: '#4b5563' }}>
              INDIVIDUAL STOCKS
            </div>
            <div className="space-y-2">
              {result.stocks.map((s, i) => {
                const rc = s.risk === 'low' ? '#22c55e' : s.risk === 'medium' ? '#f5a623' : '#ef4444';
                return (
                  <div key={i}
                    onClick={() => onSelect(s.ticker)}
                    className="p-3 rounded cursor-pointer hover:brightness-125 transition-all"
                    style={{ background: '#040404', border: '1px solid #1a1a1a' }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className="text-[16px] font-black" style={{ color: '#e2c97e' }}>{s.ticker}</span>
                        {s.name && (
                          <span className="ml-2 text-[9px]" style={{ color: '#4b5563' }}>{s.name}</span>
                        )}
                      </div>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                        style={{ background: `${rc}18`, border: `1px solid ${rc}40`, color: rc }}>
                        {s.risk?.toUpperCase() ?? 'MEDIUM'} RISK
                      </span>
                    </div>
                    <p className="text-[9px] leading-snug" style={{ color: '#6b7280' }}>{s.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 overflow-y-auto">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="text-[10px] font-black tracking-[0.25em] mb-1" style={{ color: '#a78bfa' }}>
            ✦ AI STOCK PICKER
          </div>
          <div className="text-[20px] font-black" style={{ color: '#e2c97e' }}>Help Me Pick a Stock</div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded mb-4" style={{ background: '#1f0505', border: '1px solid #3b0808' }}>
            <AlertTriangle size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <span className="text-[9px]" style={{ color: '#f87171' }}>{error}</span>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{
                  background: step >= s ? '#a78bfa' : '#111',
                  color: step >= s ? '#000' : '#374151',
                  border: `1px solid ${step >= s ? '#a78bfa' : '#1f2937'}`,
                }}>
                {s}
              </div>
              {s < 3 && <div className="w-8 h-px" style={{ background: step > s ? '#a78bfa' : '#1f2937' }} />}
            </div>
          ))}
        </div>

        {/* Step 1: Horizon */}
        {step === 1 && (
          <div>
            <div className="text-[11px] font-black mb-4 text-center" style={{ color: '#9ca3af' }}>
              What&apos;s your investment goal?
            </div>
            <div className="space-y-2">
              {([
                { val: 'short',  title: 'QUICK TRADE',  sub: 'Days/weeks · Higher risk' },
                { val: 'medium', title: 'MEDIUM TERM',  sub: '1-12 months · Balanced' },
                { val: 'long',   title: 'LONG TERM',    sub: 'Years · Lower risk, compounding' },
              ] as { val: Horizon; title: string; sub: string }[]).map(opt => (
                <div key={opt.val}
                  onClick={() => { setHorizon(opt.val); setStep(2); }}
                  style={{ ...cardBase, ...(horizon === opt.val ? cardActive : {}) }}
                >
                  <div className="text-[13px] font-black mb-0.5" style={{ color: horizon === opt.val ? '#f5a623' : '#e2c97e' }}>
                    {opt.title}
                  </div>
                  <div className="text-[9px]" style={{ color: '#4b5563' }}>{opt.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Risk */}
        {step === 2 && (
          <div>
            <div className="text-[11px] font-black mb-4 text-center" style={{ color: '#9ca3af' }}>
              Risk tolerance?
            </div>
            <div className="space-y-2 mb-4">
              {([
                { val: 'low',    title: 'CONSERVATIVE', color: '#22c55e', sub: 'Preserve capital, lower upside' },
                { val: 'medium', title: 'MODERATE',     color: '#f5a623', sub: 'Balanced growth and risk' },
                { val: 'high',   title: 'AGGRESSIVE',   color: '#ef4444', sub: 'Max upside, high volatility' },
              ] as { val: Risk; title: string; color: string; sub: string }[]).map(opt => (
                <div key={opt.val}
                  onClick={() => setRisk(opt.val)}
                  style={{ ...cardBase, ...(risk === opt.val ? riskActive : {}) }}
                >
                  <div className="text-[13px] font-black mb-0.5" style={{ color: risk === opt.val ? opt.color : '#9ca3af' }}>
                    {opt.title}
                  </div>
                  <div className="text-[9px]" style={{ color: '#4b5563' }}>{opt.sub}</div>
                  {risk === opt.val && (
                    <div className="mt-1 h-0.5 w-12 rounded" style={{ background: riskColor(opt.val) }} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2 rounded text-[9px] font-black"
                style={{ border: '1px solid #1f2937', color: '#374151' }}>BACK</button>
              <button onClick={() => risk && setStep(3)} disabled={!risk}
                className="flex-1 py-2 rounded text-[9px] font-black disabled:opacity-40"
                style={{ background: '#160d33', border: '1px solid #4c1d95', color: '#a78bfa' }}>
                NEXT
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Sector + Analyze */}
        {step === 3 && (
          <div>
            <div className="text-[11px] font-black mb-4 text-center" style={{ color: '#9ca3af' }}>
              Any sector preference?
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {(['NO PREFERENCE', ...SECTORS]).map(s => (
                <div key={s}
                  onClick={() => setSector(s === 'NO PREFERENCE' ? 'any' : s)}
                  style={{
                    ...cardBase,
                    padding: '8px 10px',
                    ...(sector === (s === 'NO PREFERENCE' ? 'any' : s) ? sectorActive : {}),
                  }}
                >
                  <div className="text-[8px] font-black"
                    style={{ color: sector === (s === 'NO PREFERENCE' ? 'any' : s) ? '#38bdf8' : '#6b7280' }}>
                    {s}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="py-2 px-4 rounded text-[9px] font-black"
                style={{ border: '1px solid #1f2937', color: '#374151' }}>BACK</button>
              <button
                onClick={analyze}
                disabled={loading}
                className="flex-1 py-2 rounded text-[10px] font-black tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#160d33', border: '1px solid #7c3aed', color: '#a78bfa' }}
              >
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                ✦ ANALYZE FOR ME
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
