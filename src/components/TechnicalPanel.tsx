'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, ComposedChart,
} from 'recharts';
import { apiFetch } from '@/lib/apiClient';

interface TechnicalSignal {
  name: string;
  value: number | null;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  detail: string;
}

interface MacdPoint {
  date: string;
  macd: number;
  signal: number;
  histogram: number;
}

interface RsiPoint {
  date: string;
  rsi: number;
  close: number;
}

interface TechnicalData {
  price: number | null;
  rsi: number | null;
  rsiHistory: RsiPoint[];
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  macd: MacdPoint | null;
  macdHistory: MacdPoint[];
  signals: TechnicalSignal[];
  overallSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

interface Props { symbol: string; }

const signalColor = (s: 'BULLISH' | 'BEARISH' | 'NEUTRAL') =>
  s === 'BULLISH' ? '#22c55e' : s === 'BEARISH' ? '#ef4444' : '#9ca3af';

const signalBg = (s: 'BULLISH' | 'BEARISH' | 'NEUTRAL') =>
  s === 'BULLISH' ? '#052e16' : s === 'BEARISH' ? '#1f0505' : '#111';

export default function TechnicalPanel({ symbol }: Props) {
  const [data,    setData]    = useState<TechnicalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setData(null);
    setLoading(true);
    setError('');
    apiFetch(`/api/fmp/technical?symbol=${symbol}`)
      .then(r => r.json())
      .then((d: TechnicalData & { error?: string }) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load technical data'); setLoading(false); });
  }, [symbol]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 rounded shimmer w-3/4" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => <div key={i} className="flex-1 h-6 rounded shimmer" />)}
        </div>
        <div className="h-32 rounded shimmer" />
        <div className="h-32 rounded shimmer" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[10px]" style={{ color: '#ef4444' }}>{error || 'No data'}</span>
      </div>
    );
  }

  const { rsi, rsiHistory, sma20, sma50, sma200, price, macd, macdHistory, signals, overallSignal } = data;

  // RSI chart: reverse so newest is on right
  const rsiChartData = [...rsiHistory].reverse().slice(-30);
  // MACD chart: reverse so newest on right
  const macdChartData = [...macdHistory].reverse().slice(-30);

  const rsiZoneColor = rsi == null ? '#9ca3af' : rsi < 30 ? '#22c55e' : rsi > 70 ? '#ef4444' : '#9ca3af';
  const rsiBarPct = rsi != null ? Math.min(Math.max(rsi, 0), 100) : 50;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4" style={{ background: '#000' }}>

      {/* Signal pills row */}
      <div className="flex flex-wrap gap-2">
        {signals.map(s => (
          <div key={s.name}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-black tracking-wider"
            style={{
              background: signalBg(s.signal),
              border: `1px solid ${signalColor(s.signal)}40`,
              color: signalColor(s.signal),
            }}
            title={s.detail}
          >
            {s.name}
            <span className="text-[7px] opacity-80">{s.value != null ? s.value.toFixed(1) : '—'}</span>
            <span>{s.signal}</span>
          </div>
        ))}
      </div>

      {/* Overall signal banner */}
      <div className="rounded p-3 flex items-center gap-3"
        style={{
          background: signalBg(overallSignal),
          border: `1px solid ${signalColor(overallSignal)}30`,
        }}>
        <div className="text-[22px] font-black tracking-widest" style={{ color: signalColor(overallSignal) }}>
          {overallSignal}
        </div>
        <div className="text-[8px]" style={{ color: '#374151' }}>
          Overall technical signal based on RSI, Moving Averages & MACD
        </div>
        {price != null && (
          <div className="ml-auto text-[11px] font-mono font-black" style={{ color: '#e2c97e' }}>
            ${price.toFixed(2)}
          </div>
        )}
      </div>

      {/* RSI gauge + chart */}
      <div className="rounded border p-3 space-y-3" style={{ background: '#040404', borderColor: '#111' }}>
        <div className="text-[8px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>RSI (14)</div>

        {/* Gauge bar */}
        <div>
          <div className="relative h-4 rounded-full overflow-hidden" style={{ background: '#0a0a0a' }}>
            {/* Zones */}
            <div className="absolute inset-y-0 left-0 rounded-l-full" style={{ width: '30%', background: '#052e16' }} />
            <div className="absolute inset-y-0" style={{ left: '30%', width: '40%', background: '#111' }} />
            <div className="absolute inset-y-0 right-0 rounded-r-full" style={{ width: '30%', background: '#1f0505' }} />
            {/* Zone labels */}
            <div className="absolute inset-y-0 left-1 flex items-center">
              <span className="text-[7px] font-black" style={{ color: '#22c55e50' }}>OVERSOLD</span>
            </div>
            <div className="absolute inset-y-0 right-1 flex items-center">
              <span className="text-[7px] font-black" style={{ color: '#ef444450' }}>OVERBOUGHT</span>
            </div>
            {/* Current marker */}
            {rsi != null && (
              <div
                className="absolute top-0 bottom-0 w-1 rounded"
                style={{
                  left: `${rsiBarPct}%`,
                  transform: 'translateX(-50%)',
                  background: rsiZoneColor,
                  boxShadow: `0 0 6px ${rsiZoneColor}`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[7px] font-mono" style={{ color: '#374151' }}>0</span>
            <span className="text-[8px] font-black font-mono" style={{ color: rsiZoneColor }}>
              {rsi != null ? rsi.toFixed(1) : '—'}
            </span>
            <span className="text-[7px] font-mono" style={{ color: '#374151' }}>100</span>
          </div>
        </div>

        {/* RSI mini-chart */}
        {rsiChartData.length > 0 && (
          <div style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rsiChartData} margin={{ top: 2, right: 5, bottom: 2, left: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis domain={[0, 100]} hide />
                <ReferenceLine y={70} stroke="#ef444450" strokeDasharray="3 2" />
                <ReferenceLine y={30} stroke="#22c55e50" strokeDasharray="3 2" />
                <ReferenceLine y={50} stroke="#37415130" strokeDasharray="2 3" />
                <Tooltip
                  contentStyle={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 4, fontSize: 9 }}
                  labelStyle={{ color: '#4b5563', fontSize: 8 }}
                  itemStyle={{ color: rsiZoneColor }}
                  formatter={(v: number | undefined) => [v?.toFixed(1) ?? '—', 'RSI']}
                  labelFormatter={(label: unknown) => typeof label === 'string' ? label.slice(0, 10) : ''}
                />
                <Line type="monotone" dataKey="rsi" stroke={rsiZoneColor} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Moving averages table */}
      <div className="rounded border p-3" style={{ background: '#040404', borderColor: '#111' }}>
        <div className="text-[8px] font-black tracking-[0.2em] mb-3" style={{ color: '#4b5563' }}>MOVING AVERAGES</div>
        <div className="space-y-2">
          {[
            { label: 'SMA 20', value: sma20 },
            { label: 'SMA 50', value: sma50 },
            { label: 'SMA 200', value: sma200 },
          ].map(({ label, value }) => {
            if (value == null) return null;
            const above = price != null && price > value;
            const diff  = price != null ? ((price - value) / value * 100) : null;
            const c     = above ? '#22c55e' : '#ef4444';
            return (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[9px] font-black w-16" style={{ color: '#6b7280' }}>{label}</span>
                <span className="text-[9px] font-mono flex-1 text-center" style={{ color: '#9ca3af' }}>
                  ${value.toFixed(2)}
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: `${c}18`, border: `1px solid ${c}40`, color: c }}>
                  {above ? 'ABOVE' : 'BELOW'}
                </span>
                {diff != null && (
                  <span className="text-[8px] font-mono w-14 text-right" style={{ color: c }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MACD section */}
      {macdChartData.length > 0 && (
        <div className="rounded border p-3" style={{ background: '#040404', borderColor: '#111' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[8px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>MACD (12, 26, 9)</div>
            {macd && (
              <div className="flex gap-3">
                <span className="text-[8px] font-mono" style={{ color: '#38bdf8' }}>
                  MACD {macd.macd.toFixed(3)}
                </span>
                <span className="text-[8px] font-mono" style={{ color: '#f472b6' }}>
                  SIG {macd.signal.toFixed(3)}
                </span>
                <span className="text-[8px] font-mono"
                  style={{ color: macd.histogram >= 0 ? '#22c55e' : '#ef4444' }}>
                  HIST {macd.histogram.toFixed(3)}
                </span>
              </div>
            )}
          </div>

          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={macdChartData} margin={{ top: 2, right: 5, bottom: 2, left: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <ReferenceLine y={0} stroke="#37415160" />
                <Tooltip
                  contentStyle={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 4, fontSize: 9 }}
                  labelStyle={{ color: '#4b5563', fontSize: 8 }}
                  labelFormatter={(label: unknown) => typeof label === 'string' ? label.slice(0, 10) : ''}
                  formatter={(v: number | undefined, name: string | undefined) => [v?.toFixed(4) ?? '—', name ?? '']}
                />
                <Bar dataKey="histogram" fill="#22c55e"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={(props: any) => {
                    const { x, y, width, height, value } = props;
                    const c = value >= 0 ? '#22c55e' : '#ef4444';
                    return <rect x={x} y={y} width={width} height={height} fill={c} opacity={0.7} />;
                  }}
                />
                <Line type="monotone" dataKey="macd"   stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="signal" stroke="#f472b6" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
