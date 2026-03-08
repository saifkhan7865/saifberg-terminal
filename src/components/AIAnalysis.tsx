'use client';

import { useState, useCallback, useEffect } from 'react';
import { Brain, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Target, Zap, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

interface Props {
  symbol: string;
}

// ─── Parsed structure ────────────────────────────────────────────────────────

interface ParsedAnalysis {
  summary: string;
  bulls: string[];
  bears: string[];
  catalysts: string[];
  technical: string;
  verdict: {
    rating: string;
    targetLow: string;
    targetHigh: string;
    upside: string;
    conviction: string;
    keyRisk: string;
  } | null;
}

function parseAnalysis(text: string): ParsedAnalysis {
  const result: ParsedAnalysis = {
    summary: '', bulls: [], bears: [], catalysts: [],
    technical: '', verdict: null,
  };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let section = '';

  for (const line of lines) {
    if (line.startsWith('EXECUTIVE SUMMARY')) { section = 'summary'; continue; }
    if (line.startsWith('BULL CASE'))         { section = 'bull'; continue; }
    if (line.startsWith('BEAR CASE'))         { section = 'bear'; continue; }
    if (line.startsWith('KEY CATALYST'))      { section = 'catalyst'; continue; }
    if (line.startsWith('TECHNICAL'))         { section = 'technical'; continue; }
    if (line.startsWith('VERDICT'))           { section = 'verdict'; continue; }

    if (section === 'summary' && line) {
      result.summary += (result.summary ? ' ' : '') + line;
    } else if (section === 'bull' && line.startsWith('[+]')) {
      result.bulls.push(line.slice(3).trim());
    } else if (section === 'bear' && line.startsWith('[-]')) {
      result.bears.push(line.slice(3).trim());
    } else if (section === 'catalyst' && line.startsWith('[~]')) {
      result.catalysts.push(line.slice(3).trim());
    } else if (section === 'technical') {
      result.technical += (result.technical ? ' ' : '') + line;
    } else if (section === 'verdict') {
      if (!result.verdict) result.verdict = { rating: '', targetLow: '', targetHigh: '', upside: '', conviction: '', keyRisk: '' };
      if (line.startsWith('Rating:')) {
        result.verdict.rating = line.replace('Rating:', '').trim();
      } else if (line.startsWith('Price Target:')) {
        const m = line.match(/\$([0-9.]+)\s*[–-]\s*\$([0-9.]+)/);
        if (m) { result.verdict.targetLow = m[1]; result.verdict.targetHigh = m[2]; }
      } else if (line.startsWith('Upside') || line.startsWith('Downside')) {
        result.verdict.upside = line.replace(/^(Upside|Downside)\/?(Downside|Upside)?:/, '').trim();
      } else if (line.startsWith('Conviction:')) {
        result.verdict.conviction = line.replace('Conviction:', '').trim();
      } else if (line.startsWith('Key Risk:')) {
        result.verdict.keyRisk = line.replace('Key Risk:', '').trim();
      }
    }
  }
  return result;
}

// ─── Verdict styles ───────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  'STRONG BUY':  { bg: '#052e16', border: '#16a34a', color: '#4ade80', icon: '🚀' },
  'BUY':         { bg: '#031a0d', border: '#15803d', color: '#86efac', icon: '▲' },
  'HOLD':        { bg: '#1c1202', border: '#b45309', color: '#fcd34d', icon: '●' },
  'SELL':        { bg: '#1c0303', border: '#b91c1c', color: '#fca5a5', icon: '▼' },
  'STRONG SELL': { bg: '#120202', border: '#ef4444', color: '#ef4444', icon: '⚠' },
};

function getVerdictStyle(rating: string) {
  for (const key of Object.keys(VERDICT_STYLE)) {
    if (rating.toUpperCase().includes(key)) return VERDICT_STYLE[key];
  }
  return { bg: '#111', border: '#2a2a2a', color: '#9ca3af', icon: '?' };
}

// ─── Sentiment gauge ─────────────────────────────────────────────────────────

function SentimentGauge({ rating }: { rating: string }) {
  const scores: Record<string, number> = {
    'STRONG BUY': 95, 'BUY': 72, 'HOLD': 50, 'SELL': 28, 'STRONG SELL': 5,
  };
  let score = 50;
  for (const key of Object.keys(scores)) {
    if (rating.toUpperCase().includes(key)) { score = scores[key]; break; }
  }
  const color = score >= 65 ? '#22c55e' : score >= 45 ? '#fbbf24' : '#ef4444';

  return (
    <div className="mt-3 mb-1">
      <div className="flex justify-between text-[8px] font-bold tracking-widest mb-1" style={{ color: '#374151' }}>
        <span>BEARISH</span><span>NEUTRAL</span><span>BULLISH</span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#111' }}>
        {/* gradient track */}
        <div className="absolute inset-0 rounded-full" style={{
          background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #22c55e 100%)',
          opacity: 0.15,
        }} />
        {/* filled */}
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color, opacity: 0.8 }} />
        {/* cursor */}
        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 shadow-lg transition-all duration-700"
          style={{ left: `calc(${score}% - 5px)`, background: color, borderColor: '#000' }} />
      </div>
      <div className="mt-1 text-center text-[8px] font-bold" style={{ color }}>{score}% BULLISH</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIAnalysis({ symbol }: Props) {
  const [parsed, setParsed]       = useState<ParsedAnalysis | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [hasRun, setHasRun]       = useState(false);
  const [analyzedSym, setAnalyzedSym] = useState('');

  useEffect(() => {
    if (symbol !== analyzedSym && hasRun) {
      setParsed(null);
      setHasRun(false);
      setError('');
    }
  }, [symbol, analyzedSym, hasRun]);

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    setHasRun(true);
    setAnalyzedSym(symbol);
    try {
      const [fundRes, quoteRes] = await Promise.allSettled([
        apiFetch(`/api/fundamentals?symbol=${symbol}`).then(r => r.json()),
        apiFetch(`/api/quote?symbol=${symbol}`).then(r => r.json()),
      ]);
      const fundamentals = fundRes.status  === 'fulfilled' ? fundRes.value  : null;
      const quote        = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
      const res  = await apiFetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, fundamentals, quote }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setParsed(null); }
      else setParsed(parseAnalysis(data.analysis || ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI analysis failed');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-1.5">
          <Brain size={11} style={{ color: '#a78bfa' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: '#a78bfa' }}>AI · GEMINI ANALYSIS — {symbol}</span>
        </div>
        <button onClick={run} disabled={loading}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest transition-all disabled:opacity-50"
          style={{ background: loading ? '#1a1a1a' : '#1e1033', border: '1px solid #4c1d95', color: '#a78bfa' }}
        >
          <RefreshCw size={9} className={loading ? 'animate-spin' : ''} />
          {loading ? 'ANALYZING...' : hasRun ? 'REFRESH' : 'RUN'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Idle state */}
        {!hasRun && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#0d0720', border: '1px solid #2d1b69' }}>
              <Brain size={28} style={{ color: '#4c1d95' }} />
            </div>
            <div className="text-center">
              <div className="text-[12px] font-bold mb-1" style={{ color: '#6b7280' }}>AI STOCK ANALYSIS</div>
              <p className="text-[10px] leading-relaxed" style={{ color: '#374151' }}>
                Powered by Google Gemini 1.5 Flash.<br />Analyzes financials, valuation, technicals<br />and generates a full investment report.
              </p>
            </div>
            <button onClick={run}
              className="px-4 py-2 rounded text-[11px] font-bold tracking-widest flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: '#1e1033', border: '1px solid #7c3aed', color: '#a78bfa' }}
            >
              <Brain size={12} /> ANALYZE {symbol}
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full pulse-live" style={{ background: '#a78bfa' }} />
              <span className="text-[10px]" style={{ color: '#6b7280' }}>GEMINI PROCESSING {symbol}...</span>
            </div>
            <div className="h-16 rounded shimmer" />
            <div className="h-2 rounded shimmer" />
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded shimmer" />)}
            </div>
            {[80, 90, 70, 85, 60].map((w, i) => (
              <div key={i} className="h-3 rounded shimmer" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 flex items-start gap-2">
            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <p className="text-[11px] font-bold mb-1" style={{ color: '#ef4444' }}>ANALYSIS FAILED</p>
              <p className="text-[10px] leading-relaxed" style={{ color: '#6b7280' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {parsed && !loading && (() => {
          const vs = parsed.verdict ? getVerdictStyle(parsed.verdict.rating) : null;
          return (
            <div className="p-3 space-y-3">

              {/* Verdict banner */}
              {parsed.verdict && vs && (
                <div className="rounded-lg p-3 border" style={{ background: vs.bg, borderColor: vs.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px]">{vs.icon}</span>
                      <div>
                        <div className="text-[9px] font-bold tracking-widest" style={{ color: '#6b7280' }}>ANALYST VERDICT</div>
                        <div className="text-[16px] font-black tracking-widest" style={{ color: vs.color }}>
                          {parsed.verdict.rating}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-bold" style={{ color: '#4b5563' }}>12M TARGET</div>
                      <div className="text-[14px] font-black font-mono" style={{ color: vs.color }}>
                        ${parsed.verdict.targetLow}–${parsed.verdict.targetHigh}
                      </div>
                      {parsed.verdict.upside && (
                        <div className="text-[10px] font-bold" style={{ color: vs.color }}>{parsed.verdict.upside}</div>
                      )}
                    </div>
                  </div>
                  <SentimentGauge rating={parsed.verdict.rating} />
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <div className="rounded px-2 py-1" style={{ background: '#00000040' }}>
                      <div className="text-[7px] font-bold" style={{ color: '#374151' }}>CONVICTION</div>
                      <div className="text-[10px] font-bold" style={{ color: vs.color }}>{parsed.verdict.conviction}</div>
                    </div>
                    <div className="rounded px-2 py-1" style={{ background: '#00000040' }}>
                      <div className="text-[7px] font-bold" style={{ color: '#374151' }}>KEY RISK</div>
                      <div className="text-[9px] leading-tight" style={{ color: '#fca5a5' }}>{parsed.verdict.keyRisk}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Executive summary */}
              {parsed.summary && (
                <div className="rounded p-2.5" style={{ background: '#080808', border: '1px solid #111' }}>
                  <div className="text-[8px] font-black tracking-widest mb-1.5" style={{ color: '#6b7280' }}>EXECUTIVE SUMMARY</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#c9b97a' }}>{parsed.summary}</p>
                </div>
              )}

              {/* Bull / Bear */}
              <div className="grid grid-cols-2 gap-2">
                {/* Bull */}
                <div className="rounded p-2.5" style={{ background: '#021208', border: '1px solid #14532d' }}>
                  <div className="flex items-center gap-1 mb-2">
                    <TrendingUp size={10} style={{ color: '#22c55e' }} />
                    <span className="text-[8px] font-black tracking-widest" style={{ color: '#22c55e' }}>BULL CASE</span>
                  </div>
                  <div className="space-y-1.5">
                    {parsed.bulls.map((b, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="flex-shrink-0 text-[10px] font-bold leading-tight" style={{ color: '#22c55e' }}>+</span>
                        <span className="text-[9px] leading-snug" style={{ color: '#86efac' }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bear */}
                <div className="rounded p-2.5" style={{ background: '#120303', border: '1px solid #7f1d1d' }}>
                  <div className="flex items-center gap-1 mb-2">
                    <TrendingDown size={10} style={{ color: '#ef4444' }} />
                    <span className="text-[8px] font-black tracking-widest" style={{ color: '#ef4444' }}>BEAR CASE</span>
                  </div>
                  <div className="space-y-1.5">
                    {parsed.bears.map((b, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="flex-shrink-0 text-[10px] font-bold leading-tight" style={{ color: '#ef4444' }}>−</span>
                        <span className="text-[9px] leading-snug" style={{ color: '#fca5a5' }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Catalysts */}
              {parsed.catalysts.length > 0 && (
                <div className="rounded p-2.5" style={{ background: '#020d1a', border: '1px solid #0c4a6e' }}>
                  <div className="flex items-center gap-1 mb-2">
                    <Zap size={10} style={{ color: '#38bdf8' }} />
                    <span className="text-[8px] font-black tracking-widest" style={{ color: '#38bdf8' }}>KEY CATALYSTS</span>
                  </div>
                  <div className="space-y-1.5">
                    {parsed.catalysts.map((c, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="flex-shrink-0 text-[10px] font-bold leading-tight" style={{ color: '#38bdf8' }}>~</span>
                        <span className="text-[9px] leading-snug" style={{ color: '#7dd3fc' }}>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical */}
              {parsed.technical && (
                <div className="rounded p-2.5" style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Target size={10} style={{ color: '#f5a623' }} />
                    <span className="text-[8px] font-black tracking-widest" style={{ color: '#f5a623' }}>TECHNICAL PICTURE</span>
                  </div>
                  <p className="text-[9px] leading-relaxed" style={{ color: '#6b7280' }}>{parsed.technical}</p>
                </div>
              )}

              {/* Risk footer */}
              {parsed.verdict?.keyRisk && (
                <div className="flex items-start gap-2 rounded p-2" style={{ background: '#0d0303', border: '1px solid #1f0505' }}>
                  <Shield size={10} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <span className="text-[8px] font-bold" style={{ color: '#7f1d1d' }}>PRIMARY RISK: </span>
                    <span className="text-[9px]" style={{ color: '#6b7280' }}>{parsed.verdict.keyRisk}</span>
                  </div>
                </div>
              )}

            </div>
          );
        })()}
      </div>
    </div>
  );
}
