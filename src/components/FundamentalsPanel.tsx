'use client';

import { FundamentalsData, QuoteData, SignalResult } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface Props {
  fundamentals: FundamentalsData | null;
  quote: QuoteData | null;
  signal: SignalResult | null;
  loading: boolean;
}

const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${(v * 100).toFixed(1)}%`;
const fmt = (v: number | null | undefined, decimals = 2) =>
  v == null ? '—' : v.toFixed(decimals);
const fmtB = (v: number | null | undefined) => {
  if (v == null) return '—';
  const n = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (n >= 1e12) return `${sign}$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sign}$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sign}$${(n / 1e6).toFixed(2)}M`;
  return `${sign}$${n.toFixed(0)}`;
};
const fmtX = (v: number | null | undefined) => v == null ? '—' : `${v.toFixed(2)}x`;

type RowColor = 'green' | 'red' | 'neutral';

function DataRow({
  label,
  value,
  color = 'neutral',
  subValue,
}: {
  label: string;
  value: string;
  color?: RowColor;
  subValue?: string;
}) {
  const colors: Record<RowColor, string> = {
    green: '#22c55e',
    red: '#ef4444',
    neutral: '#e2c97e',
  };
  return (
    <div
      className="flex items-center justify-between py-0.5 px-1 hover:bg-[#111] rounded"
      style={{ borderBottom: '1px solid #0d0d0d' }}
    >
      <span className="text-[10px]" style={{ color: '#6b7280' }}>{label}</span>
      <div className="text-right">
        <span className="text-[11px] font-mono font-semibold" style={{ color: colors[color] }}>
          {value}
        </span>
        {subValue && (
          <span className="ml-1 text-[9px]" style={{ color: '#4b5563' }}>{subValue}</span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      className="px-1 py-0.5 mt-1 mb-0.5 text-[9px] font-bold tracking-widest"
      style={{ color: '#4b5563', borderBottom: '1px solid #1a1a1a' }}
    >
      {label}
    </div>
  );
}

function SignalBadge({ signal }: { signal: SignalResult }) {
  const cls: Record<string, string> = {
    'STRONG BUY': 'signal-strong-buy',
    'BUY': 'signal-buy',
    'HOLD': 'signal-hold',
    'SELL': 'signal-sell',
    'STRONG SELL': 'signal-strong-sell',
  };
  const icons: Record<string, React.ReactNode> = {
    'STRONG BUY': <TrendingUp size={14} />,
    'BUY': <TrendingUp size={14} />,
    'HOLD': <Minus size={14} />,
    'SELL': <TrendingDown size={14} />,
    'STRONG SELL': <TrendingDown size={14} />,
  };

  const barWidth = ((signal.score + signal.scoreMax) / (signal.scoreMax * 2)) * 100;
  const barColor =
    signal.score >= 3 ? '#22c55e' :
    signal.score >= -2 ? '#d97706' :
    '#ef4444';

  return (
    <div className={`px-2 py-2 rounded ${cls[signal.signal]}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {icons[signal.signal]}
          <span className="text-sm font-black tracking-widest">{signal.signal}</span>
        </div>
        <span className="text-[10px] font-mono" style={{ opacity: 0.7 }}>
          SCORE: {signal.score > 0 ? '+' : ''}{signal.score}/{signal.scoreMax}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1 rounded-full mb-2" style={{ background: '#1a1a1a' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${barWidth}%`, background: barColor }}
        />
      </div>

      {/* Signal reasons */}
      <div className="space-y-0.5 max-h-24 overflow-y-auto">
        {signal.reasons.slice(0, 5).map((r, i) => (
          <div key={i} className="flex items-start gap-1 text-[9px]" style={{ opacity: 0.85 }}>
            <span style={{ color: r.positive ? '#22c55e' : '#ef4444', flexShrink: 0 }}>
              {r.positive ? '▲' : '▼'}
            </span>
            <span>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FundamentalsPanel({ fundamentals: f, quote: q, signal, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-4 rounded shimmer" />
        ))}
      </div>
    );
  }

  if (!f) {
    return (
      <div className="flex items-center justify-center h-32 gap-2" style={{ color: '#374151' }}>
        <AlertTriangle size={14} />
        <span className="text-[11px]">NO FUNDAMENTAL DATA</span>
      </div>
    );
  }

  const pe = f.trailingPE;
  const peColor: RowColor = pe == null ? 'neutral' : pe < 20 ? 'green' : pe > 40 ? 'red' : 'neutral';
  const marginColor = (v: number | null | undefined): RowColor =>
    v == null ? 'neutral' : v > 0.15 ? 'green' : v < 0 ? 'red' : 'neutral';
  const growthColor = (v: number | null | undefined): RowColor =>
    v == null ? 'neutral' : v > 0.1 ? 'green' : v < 0 ? 'red' : 'neutral';
  const deColor: RowColor =
    f.debtToEquity == null ? 'neutral' :
    f.debtToEquity < 50 ? 'green' :
    f.debtToEquity > 200 ? 'red' : 'neutral';

  // Analyst bar
  const totalAna = (f.analystBuy ?? 0) + (f.analystHold ?? 0) + (f.analystSell ?? 0);
  const buyPct = totalAna ? ((f.analystBuy ?? 0) / totalAna) * 100 : 0;
  const holdPct = totalAna ? ((f.analystHold ?? 0) / totalAna) * 100 : 0;
  const sellPct = totalAna ? ((f.analystSell ?? 0) / totalAna) * 100 : 0;

  // 52-week position
  const wkLow = f.fiftyTwoWeekLow ?? q?.fiftyTwoWeekLow;
  const wkHigh = f.fiftyTwoWeekHigh ?? q?.fiftyTwoWeekHigh;
  const curPrice = f.currentPrice ?? q?.regularMarketPrice;
  const wkPosition = wkLow && wkHigh && curPrice && wkHigh > wkLow
    ? ((curPrice - wkLow) / (wkHigh - wkLow)) * 100
    : null;

  return (
    <div className="overflow-y-auto h-full">
      {/* Buy/Sell Signal */}
      {signal && (
        <div className="p-2">
          <SignalBadge signal={signal} />
        </div>
      )}

      {/* VALUATION */}
      <SectionHeader label="VALUATION" />
      <DataRow label="P/E Ratio (TTM)" value={fmtX(f.trailingPE)} color={peColor} />
      <DataRow label="Forward P/E" value={fmtX(f.forwardPE)} color={f.forwardPE && f.trailingPE && f.forwardPE < f.trailingPE ? 'green' : 'neutral'} />
      <DataRow label="EPS (TTM)" value={f.trailingEps != null ? `$${fmt(f.trailingEps)}` : '—'} />
      <DataRow label="Forward EPS" value={f.forwardEps != null ? `$${fmt(f.forwardEps)}` : '—'} />
      <DataRow label="PEG Ratio" value={fmtX(f.pegRatio)} color={f.pegRatio != null ? (f.pegRatio < 1 ? 'green' : f.pegRatio > 2 ? 'red' : 'neutral') : 'neutral'} />
      <DataRow label="Price/Book" value={fmtX(f.priceToBook)} />
      <DataRow label="EV/EBITDA" value={fmtX(f.enterpriseToEbitda)} />
      <DataRow label="EV/Revenue" value={fmtX(f.enterpriseToRevenue)} />

      {/* GROWTH */}
      <SectionHeader label="GROWTH" />
      <DataRow label="Revenue Growth" value={pct(f.revenueGrowth)} color={growthColor(f.revenueGrowth)} />
      <DataRow label="Earnings Growth" value={pct(f.earningsGrowth)} color={growthColor(f.earningsGrowth)} />

      {/* MARGINS */}
      <SectionHeader label="MARGINS" />
      <DataRow label="Gross Margin" value={pct(f.grossMargins)} color={marginColor(f.grossMargins)} />
      <DataRow label="Operating Margin" value={pct(f.operatingMargins)} color={marginColor(f.operatingMargins)} />
      <DataRow label="Net Margin" value={pct(f.profitMargins)} color={marginColor(f.profitMargins)} />

      {/* FINANCIAL HEALTH */}
      <SectionHeader label="FINANCIAL HEALTH" />
      <DataRow label="Total Revenue" value={fmtB(f.totalRevenue)} />
      <DataRow label="Free Cash Flow" value={fmtB(f.freeCashflow)} color={f.freeCashflow != null ? (f.freeCashflow > 0 ? 'green' : 'red') : 'neutral'} />
      <DataRow label="Operating CF" value={fmtB(f.operatingCashflow)} />
      <DataRow label="Total Cash" value={fmtB(f.totalCash)} />
      <DataRow label="Total Debt" value={fmtB(f.totalDebt)} />
      <DataRow label="Debt/Equity" value={f.debtToEquity != null ? `${fmt(f.debtToEquity, 0)}%` : '—'} color={deColor} />
      <DataRow label="Current Ratio" value={fmt(f.currentRatio)} color={f.currentRatio != null ? (f.currentRatio > 1.5 ? 'green' : f.currentRatio < 1 ? 'red' : 'neutral') : 'neutral'} />
      <DataRow label="Quick Ratio" value={fmt(f.quickRatio)} />
      <DataRow label="Book Value/Sh" value={f.bookValue != null ? `$${fmt(f.bookValue)}` : '—'} />

      {/* DIVIDENDS */}
      {(f.dividendYield || f.dividendRate) && (
        <>
          <SectionHeader label="DIVIDENDS" />
          <DataRow label="Dividend Yield" value={pct(f.dividendYield)} color="green" />
          <DataRow label="Annual Rate" value={f.dividendRate != null ? `$${fmt(f.dividendRate, 2)}` : '—'} />
          <DataRow label="Payout Ratio" value={pct(f.payoutRatio)} />
        </>
      )}

      {/* ANALYST */}
      <SectionHeader label="ANALYST CONSENSUS" />
      <div className="px-1 py-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: '#6b7280' }}>
            {f.recommendationKey?.toUpperCase() || '—'}
          </span>
          <span className="text-[10px]" style={{ color: '#9ca3af' }}>
            {f.recommendationMean?.toFixed(1)}/5.0 · {f.numberOfAnalystOpinions || '?'} analysts
          </span>
        </div>
        {/* Analyst bar */}
        {totalAna > 0 && (
          <div className="flex h-2 rounded overflow-hidden mb-1">
            <div style={{ width: `${buyPct}%`, background: '#22c55e' }} title={`Buy: ${f.analystBuy}`} />
            <div style={{ width: `${holdPct}%`, background: '#d97706' }} title={`Hold: ${f.analystHold}`} />
            <div style={{ width: `${sellPct}%`, background: '#ef4444' }} title={`Sell: ${f.analystSell}`} />
          </div>
        )}
        <div className="flex justify-between text-[9px]" style={{ color: '#4b5563' }}>
          <span style={{ color: '#22c55e' }}>BUY {f.analystBuy ?? '—'}</span>
          <span style={{ color: '#d97706' }}>HOLD {f.analystHold ?? '—'}</span>
          <span style={{ color: '#ef4444' }}>SELL {f.analystSell ?? '—'}</span>
        </div>
        <DataRow
          label="Price Target"
          value={f.targetMeanPrice ? `$${fmt(f.targetMeanPrice)}` : '—'}
          subValue={f.targetMeanPrice && curPrice
            ? `(${((f.targetMeanPrice - curPrice) / curPrice * 100).toFixed(1)}%)`
            : undefined}
          color={f.targetMeanPrice && curPrice ? (f.targetMeanPrice > curPrice ? 'green' : 'red') : 'neutral'}
        />
        <DataRow label="Target Range" value={f.targetLowPrice && f.targetHighPrice ? `$${fmt(f.targetLowPrice, 0)} – $${fmt(f.targetHighPrice, 0)}` : '—'} />
      </div>

      {/* 52-WEEK */}
      <SectionHeader label="52-WEEK RANGE" />
      <div className="px-1 py-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: '#6b7280' }}>${fmt(wkLow ?? null, 2)}</span>
          <span className="text-[10px] font-bold" style={{ color: '#e2c97e' }}>${fmt(curPrice ?? null, 2)}</span>
          <span className="text-[10px]" style={{ color: '#6b7280' }}>${fmt(wkHigh ?? null, 2)}</span>
        </div>
        <div className="h-1.5 rounded-full relative" style={{ background: '#1a1a1a' }}>
          {wkPosition != null && (
            <>
              <div
                className="h-full rounded-full"
                style={{ width: `${wkPosition}%`, background: `linear-gradient(90deg, #ef4444, #d97706, #22c55e)` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border"
                style={{
                  left: `${wkPosition}%`,
                  transform: 'translate(-50%, -50%)',
                  background: '#e2c97e',
                  borderColor: '#000',
                }}
              />
            </>
          )}
        </div>
        {wkPosition != null && (
          <div className="text-center mt-1 text-[9px]" style={{ color: '#4b5563' }}>
            {wkPosition.toFixed(1)}% FROM LOW
          </div>
        )}
      </div>

      {/* SHORT INTEREST */}
      {f.shortPercentOfFloat != null && (
        <>
          <SectionHeader label="SHORT INTEREST" />
          <DataRow label="Short % Float" value={pct(f.shortPercentOfFloat)} color={f.shortPercentOfFloat > 0.15 ? 'red' : 'neutral'} />
          <DataRow label="Short Ratio" value={fmt(f.shortRatio)} />
        </>
      )}

      {/* IDENTITY */}
      <SectionHeader label="COMPANY" />
      <DataRow label="Sector" value={f.sector || '—'} />
      <DataRow label="Industry" value={f.industry || '—'} />
      <DataRow label="Beta" value={fmt(f.beta)} color={f.beta != null ? (f.beta > 1.5 ? 'red' : f.beta < 0.5 ? 'green' : 'neutral') : 'neutral'} />

      <div className="h-4" />
    </div>
  );
}
