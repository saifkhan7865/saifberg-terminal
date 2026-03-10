'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ChartQuote } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';

interface Props {
  symbol: string;
  previousClose?: number;
}

type Range = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';
const RANGES: Range[] = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const price = payload[0]?.value;
  let dateStr = '';
  try { dateStr = format(parseISO(label || ''), 'MMM d, yyyy HH:mm'); } catch { dateStr = label || ''; }
  return (
    <div
      className="px-2 py-1 border text-[10px]"
      style={{ background: '#1c2128', borderColor: '#2a2a2a', color: '#e2c97e' }}
    >
      <div style={{ color: '#6b7280' }}>{dateStr}</div>
      <div className="font-bold">${price?.toFixed(2)}</div>
    </div>
  );
};

export default function PriceChart({ symbol, previousClose }: Props) {
  const [range, setRange] = useState<Range>('1mo');
  const [quotes, setQuotes] = useState<ChartQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/chart?symbol=${symbol}&range=${range}`);
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  const chartData = quotes.map((q) => ({ date: q.date, price: q.close }));
  const prices = chartData.map((d) => d.price ?? 0).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) * 0.998 : 0;
  const maxPrice = prices.length ? Math.max(...prices) * 1.002 : 0;
  const firstPrice = prices[0] ?? previousClose ?? 0;
  const lastPrice = prices[prices.length - 1] ?? 0;
  const isUp = lastPrice >= firstPrice;

  const fmtDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (range === '1d') return format(d, 'HH:mm');
      if (range === '5d') return format(d, 'EEE');
      if (range === '1mo' || range === '3mo') return format(d, 'MMM d');
      return format(d, 'MMM yy');
    } catch { return ''; }
  };

  const strokeColor = isUp ? '#22c55e' : '#ef4444';
  const gradientId = `chartGrad-${symbol}`;

  return (
    <div className="flex flex-col gap-1">
      {/* Range selector */}
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-2 py-0.5 text-[10px] font-bold rounded transition-colors"
            style={{
              background: range === r ? 'rgba(245,166,35,0.12)' : 'transparent',
              color: range === r ? '#f5a623' : '#6e7681',
              border: `1px solid ${range === r ? 'rgba(245,166,35,0.35)' : 'transparent'}`,
            }}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: 140 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px]" style={{ color: '#6e7681' }}>LOADING CHART...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px]" style={{ color: '#6e7681' }}>NO DATA</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fill: '#6e7681', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fill: '#6e7681', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                tickLine={false}
                axisLine={false}
                width={40}
                tickCount={4}
              />
              <Tooltip content={<CustomTooltip />} />
              {previousClose && (
                <ReferenceLine
                  y={previousClose}
                  stroke="#30363d"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
