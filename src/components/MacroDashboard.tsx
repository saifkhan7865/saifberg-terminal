'use client';

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { apiFetch } from '@/lib/apiClient';
import { TrendingUp, TrendingDown, Brain, RefreshCw, AlertTriangle, Info } from 'lucide-react';

interface MacroMetric { name: string; date: string; value: number; }
interface TreasuryData {
  date: string;
  month1: number; month2: number; month3: number; month6: number;
  year1: number; year2: number; year3: number; year5: number;
  year7: number; year10: number; year20: number; year30: number;
}
interface MacroData {
  gdp: MacroMetric | null; gdpPrev: MacroMetric | null;
  cpi: MacroMetric | null; cpiPrev: MacroMetric | null;
  inflation: MacroMetric | null; inflationPrev: MacroMetric | null;
  unemployment: MacroMetric | null; unemploymentPrev: MacroMetric | null;
  sentiment: MacroMetric | null; sentimentPrev: MacroMetric | null;
  treasury: TreasuryData | null;
}

const YIELD_CURVE_POINTS = [
  { label: '1M', key: 'month1' },
  { label: '3M', key: 'month3' },
  { label: '6M', key: 'month6' },
  { label: '1Y', key: 'year1' },
  { label: '2Y', key: 'year2' },
  { label: '5Y', key: 'year5' },
  { label: '10Y', key: 'year10' },
  { label: '30Y', key: 'year30' },
] as const;

const METRIC_INFO: Record<string, { what: string; upMeans: string; downMeans: string; target?: string }> = {
  GDP: {
    what: 'Gross Domestic Product — total value of all goods & services produced. The primary measure of economic health.',
    upMeans: '📈 Economy is GROWING — more jobs, higher corporate earnings, bullish for stocks.',
    downMeans: '📉 Economy is SHRINKING — two consecutive quarters of decline = recession.',
    target: 'Healthy: 2–3% annual growth',
  },
  CPI: {
    what: "Consumer Price Index — tracks the price of everyday goods (food, rent, gas). Measures how expensive life is getting.",
    upMeans: '⚠️ Prices rising FASTER — inflation accelerating, Fed may raise rates to cool it.',
    downMeans: '✅ Prices stabilizing — inflation cooling, positive for bonds and growth stocks.',
    target: 'Fed targets 2% annual inflation',
  },
  INFLATION: {
    what: "Year-over-year % change in consumer prices. The Fed's most-watched number for setting interest rates.",
    upMeans: '⚠️ Inflation RISING — above 2% target forces Fed to hike rates → higher borrowing costs → stock valuations compress.',
    downMeans: '✅ Inflation FALLING — disinflationary trend, supports rate cuts and stock rallies.',
    target: 'Fed target: ~2%',
  },
  UNEMPLOYMENT: {
    what: "% of the workforce actively looking for work but without a job. Key gauge of labor market strength.",
    upMeans: '⚠️ More people losing jobs — economic slowdown, consumers spend less, earnings under pressure.',
    downMeans: '✅ Fewer unemployed — strong labor market, higher consumer spending, bullish economy.',
    target: 'Full employment: ~4%',
  },
  SENTIMENT: {
    what: "University of Michigan Consumer Sentiment Index — measures how optimistic consumers are about the economy. Consumers drive 70% of US GDP.",
    upMeans: '✅ Consumers feel CONFIDENT — they spend more, boosting GDP and corporate revenues.',
    downMeans: '⚠️ Consumers feel PESSIMISTIC — spending slows, GDP contracts, risk-off environment.',
    target: 'Healthy: above 70',
  },
};

// ─── Inline hover tooltip ─────────────────────────────────────────────────────
function InfoTooltip({ content, upMeans, downMeans, target }: {
  content: string; upMeans: string; downMeans: string; target?: string;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="rounded-full flex items-center justify-center"
        style={{ color: '#374151' }}
      >
        <Info size={10} />
      </button>
      {show && (
        <div className="absolute left-0 top-5 z-50 w-64 rounded border p-3 shadow-xl"
          style={{ background: '#1c2128', borderColor: '#222', minWidth: 240 }}>
          <p className="text-[9px] leading-relaxed mb-2" style={{ color: '#9ca3af' }}>{content}</p>
          <div className="space-y-1 border-t pt-2" style={{ borderColor: '#21262d' }}>
            <p className="text-[8px] leading-snug" style={{ color: '#6b7280' }}>{upMeans}</p>
            <p className="text-[8px] leading-snug" style={{ color: '#6b7280' }}>{downMeans}</p>
            {target && <p className="text-[8px] font-bold mt-1" style={{ color: '#374151' }}>{target}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({
  label, infoKey, current, prev, improveWhenLower,
}: {
  label: string; infoKey: string;
  current: MacroMetric | null; prev: MacroMetric | null;
  improveWhenLower: boolean;
}) {
  const val     = current?.value ?? null;
  const prevVal = prev?.value    ?? null;
  const info    = METRIC_INFO[infoKey];

  let trend: 'up' | 'down' | null = null;
  if (val != null && prevVal != null) trend = val > prevVal ? 'up' : 'down';

  let color = '#e2c97e';
  if (trend) {
    const isGood = improveWhenLower ? trend === 'down' : trend === 'up';
    color = isGood ? '#22c55e' : '#ef4444';
  }

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
    return v.toFixed(v >= 100 ? 1 : 2);
  };

  const pctChange = val != null && prevVal != null && prevVal !== 0
    ? ((val - prevVal) / Math.abs(prevVal)) * 100 : null;

  // Signal label
  let signal = '';
  if (trend) {
    const isGood = improveWhenLower ? trend === 'down' : trend === 'up';
    signal = isGood ? '● GOOD' : '● WATCH';
  }

  return (
    <div className="flex-1 p-4 border rounded relative overflow-visible"
      style={{ background: '#040404', borderColor: '#111' }}>
      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="text-[8px] font-black tracking-[0.2em]" style={{ color: '#374151' }}>{label}</div>
        {info && (
          <InfoTooltip
            content={info.what}
            upMeans={info.upMeans}
            downMeans={info.downMeans}
            target={info.target}
          />
        )}
        {signal && (
          <span className="ml-auto text-[7px] font-black tracking-wider"
            style={{ color: color }}>
            {signal}
          </span>
        )}
      </div>
      {val == null ? (
        <div className="h-7 rounded shimmer" />
      ) : (
        <>
          <div className="flex items-end gap-1.5">
            <span className="text-[22px] font-black font-mono leading-none" style={{ color }}>
              {fmt(val)}
            </span>
            {trend && (
              <span className="mb-0.5">
                {trend === 'up'
                  ? <TrendingUp size={13} style={{ color }} />
                  : <TrendingDown size={13} style={{ color }} />}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {pctChange != null && (
              <span className="text-[9px] font-bold" style={{ color }}>
                {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
              </span>
            )}
            {prevVal != null && (
              <span className="text-[8px]" style={{ color: '#374151' }}>
                prev: {fmt(prevVal)}
              </span>
            )}
          </div>
          {current?.date && (
            <div className="text-[7px] mt-1.5" style={{ color: '#1f2937' }}>{current.date}</div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Rule-based macro signals ─────────────────────────────────────────────────
function buildSignals(data: MacroData): { label: string; signal: 'bull' | 'bear' | 'neutral'; detail: string }[] {
  const signals = [];

  // GDP
  const gdpTrend = data.gdp && data.gdpPrev
    ? data.gdp.value > data.gdpPrev.value : null;
  signals.push({
    label: 'GDP',
    signal: gdpTrend === true ? 'bull' : gdpTrend === false ? 'bear' : 'neutral',
    detail: data.gdp
      ? `${data.gdp.value.toLocaleString()} — Economy ${gdpTrend ? 'expanding ✅' : 'contracting ⚠️'}`
      : 'No data',
  } as const);

  // Inflation
  const inflationVal = data.inflation?.value ?? null;
  const inflationTrend = data.inflation && data.inflationPrev
    ? data.inflation.value > data.inflationPrev.value : null;
  let inflationSignal: 'bull' | 'bear' | 'neutral' = 'neutral';
  if (inflationVal != null) {
    if (inflationVal < 2) inflationSignal = 'bull';
    else if (inflationVal <= 3) inflationSignal = 'neutral';
    else inflationSignal = 'bear';
  }
  signals.push({
    label: 'INFLATION',
    signal: inflationSignal,
    detail: inflationVal != null
      ? `${inflationVal.toFixed(2)}% — ${inflationVal < 2 ? 'Below Fed target, supports cuts' : inflationVal <= 3 ? 'Near Fed target (2%), manageable' : 'Above target — rate hike pressure ⚠️'}${inflationTrend != null ? (inflationTrend ? ' · trending up' : ' · trending down') : ''}`
      : 'No data',
  });

  // Unemployment
  const unempVal = data.unemployment?.value ?? null;
  const unempTrend = data.unemployment && data.unemploymentPrev
    ? data.unemployment.value > data.unemploymentPrev.value : null;
  let unempSignal: 'bull' | 'bear' | 'neutral' = 'neutral';
  if (unempVal != null) {
    if (unempVal < 4) unempSignal = 'bull';
    else if (unempVal <= 5) unempSignal = 'neutral';
    else unempSignal = 'bear';
  }
  signals.push({
    label: 'UNEMPLOYMENT',
    signal: unempSignal,
    detail: unempVal != null
      ? `${unempVal.toFixed(2)}% — ${unempVal < 4 ? 'Near full employment ✅' : unempVal <= 5 ? 'Slightly elevated' : 'High unemployment ⚠️'}${unempTrend != null ? (unempTrend ? ' · rising ⚠️' : ' · falling ✅') : ''}`
      : 'No data',
  });

  // Consumer sentiment
  const sentVal = data.sentiment?.value ?? null;
  const sentTrend = data.sentiment && data.sentimentPrev
    ? data.sentiment.value > data.sentimentPrev.value : null;
  let sentSignal: 'bull' | 'bear' | 'neutral' = 'neutral';
  if (sentVal != null) {
    if (sentVal >= 80) sentSignal = 'bull';
    else if (sentVal >= 60) sentSignal = 'neutral';
    else sentSignal = 'bear';
  }
  signals.push({
    label: 'CONSUMER SENTIMENT',
    signal: sentSignal,
    detail: sentVal != null
      ? `${sentVal.toFixed(1)} — ${sentVal >= 80 ? 'Strong consumer confidence ✅' : sentVal >= 60 ? 'Moderate — consumers cautious' : 'Low confidence ⚠️ — consumers pulling back'}${sentTrend != null ? (sentTrend ? ' · improving' : ' · weakening') : ''}`
      : 'No data',
  });

  // Yield curve
  if (data.treasury) {
    const spread = (data.treasury.year10 ?? 0) - (data.treasury.year2 ?? 0);
    const inverted = spread < 0;
    signals.push({
      label: 'YIELD CURVE (10Y–2Y)',
      signal: inverted ? 'bear' : spread < 0.5 ? 'neutral' : 'bull',
      detail: `Spread: ${spread >= 0 ? '+' : ''}${spread.toFixed(2)}% — ${inverted ? '⚠️ INVERTED (historical recession predictor)' : spread < 0.5 ? 'Flat — economic uncertainty' : 'Normal — growth expected'}`,
    } as const);
  }

  return signals;
}

// ─── AI parser ────────────────────────────────────────────────────────────────
interface MacroAI {
  signal: string; verdict: string;
  markets: string; risks: string[];
  fed: string; outlook: string;
}

function parseMacroAI(text: string): MacroAI {
  const r: MacroAI = { signal: '', verdict: '', markets: '', risks: [], fed: '', outlook: '' };
  let section = '';
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (line.startsWith('MACRO SIGNAL'))              { section = 'signal'; continue; }
    if (line.startsWith('WHAT THIS MEANS FOR MARKETS')){ section = 'markets'; continue; }
    if (line.startsWith('KEY RISKS'))                  { section = 'risks'; continue; }
    if (line.startsWith('FED WATCH'))                  { section = 'fed'; continue; }
    if (line.startsWith('ONE YEAR OUTLOOK'))            { section = 'outlook'; continue; }
    if (section === 'signal') {
      const col = line.indexOf(':');
      if (col > -1) { r.signal = line.slice(0, col).trim(); r.verdict = line.slice(col + 1).trim(); }
      else r.verdict += (r.verdict ? ' ' : '') + line;
    } else if (section === 'markets') r.markets += (r.markets ? ' ' : '') + line;
    else if (section === 'risks' && line.startsWith('[~]')) r.risks.push(line.slice(3).trim());
    else if (section === 'fed') r.fed += (r.fed ? ' ' : '') + line;
    else if (section === 'outlook') r.outlook += (r.outlook ? ' ' : '') + line;
  }
  return r;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MacroDashboard() {
  const [data,       setData]      = useState<MacroData | null>(null);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState('');
  const [aiResult,   setAiResult]  = useState<MacroAI | null>(null);
  const [aiLoading,  setAiLoading] = useState(false);
  const [aiError,    setAiError]   = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/fmp/macro')
      .then(r => r.json())
      .then((d: MacroData) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load macro data'); setLoading(false); });
  }, []);

  const runAI = async (macroData: MacroData) => {
    if (aiLoading) return;
    setAiLoading(true); setAiError('');
    try {
      const res  = await apiFetch('/api/ai-macro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(macroData),
      });
      const d = await res.json() as { analysis?: string; error?: string };
      if (d.error) setAiError(d.error);
      else setAiResult(parseMacroAI(d.analysis || ''));
    } catch { setAiError('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  const yieldCurveData = data?.treasury
    ? YIELD_CURVE_POINTS.map(p => ({ label: p.label, yield: data.treasury![p.key] ?? null }))
    : [];
  const yMin = yieldCurveData.length > 0
    ? Math.floor(Math.min(...yieldCurveData.filter(d => d.yield != null).map(d => d.yield as number)) * 10) / 10 : 0;
  const yMax = yieldCurveData.length > 0
    ? Math.ceil(Math.max(...yieldCurveData.filter(d => d.yield != null).map(d => d.yield as number)) * 10) / 10 : 6;

  const signals = data ? buildSignals(data) : [];
  const bullCount = signals.filter(s => s.signal === 'bull').length;
  const bearCount = signals.filter(s => s.signal === 'bear').length;
  const overallSignal = bullCount > bearCount + 1 ? 'BULLISH' : bearCount > bullCount + 1 ? 'BEARISH' : 'MIXED';
  const overallColor  = overallSignal === 'BULLISH' ? '#22c55e' : overallSignal === 'BEARISH' ? '#ef4444' : '#f5a623';

  const signalColor = (s: 'bull' | 'bear' | 'neutral') =>
    s === 'bull' ? '#22c55e' : s === 'bear' ? '#ef4444' : '#9ca3af';

  const aiSignalColor = (s: string) => {
    const u = s.toUpperCase();
    if (u.includes('BULLISH')) return '#22c55e';
    if (u.includes('BEARISH')) return '#ef4444';
    return '#f5a623';
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full" style={{ background: '#0d1117' }}>
      <div className="text-[9px] font-black tracking-[0.25em]" style={{ color: '#4b5563' }}>
        MACRO ECONOMIC DASHBOARD
      </div>

      {error && (
        <div className="text-[10px] p-3 rounded" style={{ background: '#1f0505', color: '#ef4444' }}>{error}</div>
      )}

      {/* ── Metric cards ── */}
      {loading ? (
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="flex-1 h-28 rounded shimmer" />)}
        </div>
      ) : (
        <div className="flex gap-3">
          <MetricCard label="GDP (QUARTERLY)"    infoKey="GDP"         current={data?.gdp ?? null}         prev={data?.gdpPrev ?? null}         improveWhenLower={false} />
          <MetricCard label="CPI"                infoKey="CPI"         current={data?.cpi ?? null}         prev={data?.cpiPrev ?? null}         improveWhenLower={true}  />
          <MetricCard label="INFLATION RATE"     infoKey="INFLATION"   current={data?.inflation ?? null}   prev={data?.inflationPrev ?? null}   improveWhenLower={true}  />
          <MetricCard label="UNEMPLOYMENT %"     infoKey="UNEMPLOYMENT" current={data?.unemployment ?? null} prev={data?.unemploymentPrev ?? null} improveWhenLower={true} />
          <MetricCard label="CONSUMER SENTIMENT" infoKey="SENTIMENT"   current={data?.sentiment ?? null}   prev={data?.sentimentPrev ?? null}   improveWhenLower={false} />
        </div>
      )}

      {/* ── Yield Curve ── */}
      <div className="rounded border p-4" style={{ background: '#040404', borderColor: '#111' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-[9px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>US TREASURY YIELD CURVE</div>
            <InfoTooltip
              content="The yield curve plots interest rates across different maturities. Shape reveals market expectations about growth and Fed policy."
              upMeans="Normal (upward sloping): long rates > short rates — economy expected to grow."
              downMeans="Inverted (downward): short rates > long rates — historically precedes recessions within 12–18 months."
              target="10Y-2Y spread > 0 = healthy; < 0 = inverted = warning"
            />
          </div>
          {data?.treasury?.date && (
            <div className="text-[7px]" style={{ color: '#1f2937' }}>As of {data.treasury.date}</div>
          )}
        </div>

        {loading ? (
          <div className="h-40 rounded shimmer" />
        ) : yieldCurveData.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <span className="text-[9px]" style={{ color: '#1f2937' }}>No yield curve data</span>
          </div>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldCurveData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#21262d' }} tickLine={false} />
                <YAxis domain={[yMin - 0.1, yMax + 0.1]} tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#21262d' }} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}%`} width={45} />
                <RechartsTooltip
                  contentStyle={{ background: '#1c2128', border: '1px solid #222', borderRadius: 4 }}
                  labelStyle={{ color: '#e2c97e', fontSize: 10, fontWeight: 700 }}
                  itemStyle={{ color: '#f5a623', fontSize: 10 }}
                  formatter={(v: number | undefined) => [`${v?.toFixed(2) ?? '—'}%`, 'Yield']}
                />
                <ReferenceLine y={0} stroke="#1f2937" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="yield" stroke="#f5a623" strokeWidth={2}
                  dot={{ r: 3, fill: '#f5a623', stroke: '#000', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#fbbf24' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {!loading && yieldCurveData.length > 0 && (
          <div className="flex gap-1 mt-3 pt-3 border-t" style={{ borderColor: '#0a0a0a' }}>
            {yieldCurveData.map(p => (
              <div key={p.label} className="flex-1 text-center">
                <div className="text-[7px] font-bold mb-0.5" style={{ color: '#374151' }}>{p.label}</div>
                <div className="text-[9px] font-mono font-black" style={{ color: '#e2c97e' }}>
                  {p.yield != null ? `${p.yield.toFixed(2)}%` : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Macro Signal Interpretation ── */}
      {!loading && signals.length > 0 && (
        <div className="rounded border p-4" style={{ background: '#040404', borderColor: '#111' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>MACRO SIGNAL INTERPRETATION</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-widest" style={{ color: overallColor }}>{overallSignal}</span>
              <span className="text-[8px]" style={{ color: '#374151' }}>
                {bullCount} bullish · {bearCount} bearish · {signals.length - bullCount - bearCount} neutral
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {signals.map(s => (
              <div key={s.label} className="flex items-start gap-3 px-3 py-2 rounded"
                style={{ background: `${signalColor(s.signal)}08`, border: `1px solid ${signalColor(s.signal)}20` }}>
                <div className="flex-shrink-0 w-28 text-[8px] font-black tracking-wider" style={{ color: signalColor(s.signal) }}>
                  {s.label}
                </div>
                <div className="text-[9px] leading-snug" style={{ color: '#9ca3af' }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Macro Analysis ── */}
      <div className="rounded border p-4" style={{ background: '#040404', borderColor: '#111' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain size={11} style={{ color: '#a78bfa' }} />
            <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: '#a78bfa' }}>AI MACRO ANALYSIS</span>
          </div>
          {data && (
            <button
              onClick={() => runAI(data)}
              disabled={aiLoading}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black tracking-widest disabled:opacity-40 transition-all"
              style={{ background: '#160d33', border: '1px solid #4c1d95', color: '#a78bfa' }}
            >
              <RefreshCw size={8} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'ANALYZING...' : aiResult ? 'REFRESH' : 'ANALYZE'}
            </button>
          )}
        </div>

        {aiLoading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full pulse-live" style={{ background: '#a78bfa' }} />
              <span className="text-[9px]" style={{ color: '#374151' }}>GEMINI ANALYZING MACRO DATA...</span>
            </div>
            {[90, 75, 85, 65, 95].map((w, i) => <div key={i} className="h-3 rounded shimmer" style={{ width: `${w}%` }} />)}
          </div>
        ) : aiError ? (
          <div className="flex items-start gap-2">
            <AlertTriangle size={11} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="text-[10px] font-black mb-0.5" style={{ color: '#ef4444' }}>ANALYSIS UNAVAILABLE</div>
              <div className="text-[9px]" style={{ color: '#4b5563' }}>{aiError}</div>
            </div>
          </div>
        ) : !aiResult ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Brain size={26} style={{ color: '#1e1033' }} />
            <p className="text-[9px] text-center leading-relaxed" style={{ color: '#1f2937' }}>
              Click ANALYZE for an AI-powered macro outlook.<br />Gemini will interpret the data and forecast market impact.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Signal verdict */}
            {aiResult.verdict && (
              <div className="rounded p-3" style={{ background: `${aiSignalColor(aiResult.signal)}0a`, border: `1px solid ${aiSignalColor(aiResult.signal)}25` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-black" style={{ color: aiSignalColor(aiResult.signal) }}>
                    {aiResult.signal || 'OUTLOOK'}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed font-medium" style={{ color: '#c4b5fd' }}>{aiResult.verdict}</p>
              </div>
            )}
            {/* Market implications */}
            {aiResult.markets && (
              <div className="rounded p-3" style={{ background: '#060606', border: '1px solid #111' }}>
                <div className="text-[7px] font-black tracking-[0.2em] mb-1.5" style={{ color: '#4b5563' }}>MARKET IMPLICATIONS</div>
                <p className="text-[10px] leading-relaxed" style={{ color: '#c9b97a' }}>{aiResult.markets}</p>
              </div>
            )}
            {/* Risks */}
            {aiResult.risks.length > 0 && (
              <div className="rounded p-3" style={{ background: '#080202', border: '1px solid #1f0505' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={9} style={{ color: '#ef4444' }} />
                  <span className="text-[7px] font-black tracking-[0.2em]" style={{ color: '#7f1d1d' }}>KEY RISKS AHEAD</span>
                </div>
                <div className="space-y-1">
                  {aiResult.risks.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[9px] font-black flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }}>~</span>
                      <span className="text-[9px] leading-snug" style={{ color: '#6b7280' }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Fed + Outlook side by side */}
            <div className="grid grid-cols-2 gap-3">
              {aiResult.fed && (
                <div className="rounded p-3" style={{ background: '#040408', border: '1px solid #0c0c1a' }}>
                  <div className="text-[7px] font-black tracking-[0.2em] mb-1.5" style={{ color: '#374151' }}>FED WATCH</div>
                  <p className="text-[9px] leading-snug" style={{ color: '#818cf8' }}>{aiResult.fed}</p>
                </div>
              )}
              {aiResult.outlook && (
                <div className="rounded p-3" style={{ background: '#040408', border: '1px solid #0c0c1a' }}>
                  <div className="text-[7px] font-black tracking-[0.2em] mb-1.5" style={{ color: '#374151' }}>12-MONTH OUTLOOK</div>
                  <p className="text-[9px] leading-snug" style={{ color: '#9ca3af' }}>{aiResult.outlook}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
