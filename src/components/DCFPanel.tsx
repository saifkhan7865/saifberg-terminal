'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiClient';

interface DcfData {
  symbol: string;
  dcfValue: number;
  currentPrice: number;
  upside: number;
  overvalued: boolean;
  date: string;
}

interface Props { symbol: string; }

export default function DCFPanel({ symbol }: Props) {
  const [data,    setData]    = useState<DcfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setData(null);
    setLoading(true);
    setError('');
    apiFetch(`/api/fmp/dcf?symbol=${symbol}`)
      .then(r => r.json())
      .then((d: DcfData & { error?: string }) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load DCF data'); setLoading(false); });
  }, [symbol]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 rounded shimmer w-1/2" />
        <div className="h-24 rounded shimmer" />
        <div className="h-12 rounded shimmer" />
        <div className="h-40 rounded shimmer" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div className="text-[11px] font-black" style={{ color: '#4b5563' }}>DCF NOT AVAILABLE</div>
        <p className="text-[9px] text-center leading-relaxed" style={{ color: '#1f2937' }}>
          {error || 'No DCF valuation data available for this stock.'}
        </p>
        <p className="text-[8px] text-center" style={{ color: '#111' }}>
          DCF requires reliable cash flow projections. Not all stocks have this data.
        </p>
      </div>
    );
  }

  const { dcfValue, currentPrice, upside, overvalued, date } = data;
  const absUpside = Math.abs(upside);

  // Verdict
  let verdict: 'UNDERVALUED' | 'FAIRLY VALUED' | 'OVERVALUED';
  let verdictColor: string;
  if      (upside > 10)  { verdict = 'UNDERVALUED';   verdictColor = '#22c55e'; }
  else if (upside < -10) { verdict = 'OVERVALUED';     verdictColor = '#ef4444'; }
  else                   { verdict = 'FAIRLY VALUED';  verdictColor = '#f5a623'; }

  // Bar: position current price and DCF relative to each other
  const low  = Math.min(dcfValue, currentPrice) * 0.9;
  const high = Math.max(dcfValue, currentPrice) * 1.1;
  const range = high - low;
  const dcfPct  = range > 0 ? ((dcfValue     - low) / range) * 100 : 50;
  const pricePct = range > 0 ? ((currentPrice - low) / range) * 100 : 50;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4" style={{ background: '#000' }}>

      {/* Title */}
      <div className="text-[9px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>
        DISCOUNTED CASH FLOW VALUATION
      </div>

      {/* Verdict banner */}
      <div className="rounded p-4"
        style={{
          background: `${verdictColor}0a`,
          border: `1px solid ${verdictColor}30`,
        }}>
        <div className="text-[28px] font-black mb-1" style={{ color: verdictColor }}>{verdict}</div>
        <div className="text-[11px] font-mono" style={{ color: `${verdictColor}cc` }}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% vs intrinsic value
        </div>
        {date && <div className="text-[7px] mt-1.5" style={{ color: '#1f2937' }}>DCF as of {date}</div>}
      </div>

      {/* Price comparison */}
      <div className="rounded border p-4" style={{ background: '#040404', borderColor: '#111' }}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[7px] font-black tracking-widest mb-1" style={{ color: '#374151' }}>DCF INTRINSIC VALUE</div>
            <div className="text-[28px] font-black font-mono leading-none" style={{ color: verdictColor }}>
              ${dcfValue.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-black tracking-widest mb-1" style={{ color: '#374151' }}>CURRENT PRICE</div>
            <div className="text-[28px] font-black font-mono leading-none" style={{ color: '#e2c97e' }}>
              ${currentPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Visual bar */}
        <div className="relative h-8 rounded overflow-hidden" style={{ background: '#0a0a0a' }}>
          {/* Range fill */}
          <div
            className="absolute inset-y-0 rounded"
            style={{
              left: `${Math.min(dcfPct, pricePct)}%`,
              width: `${Math.abs(dcfPct - pricePct)}%`,
              background: `${verdictColor}20`,
            }}
          />
          {/* DCF marker */}
          <div
            className="absolute inset-y-1 w-1 rounded"
            style={{
              left: `${dcfPct}%`,
              transform: 'translateX(-50%)',
              background: verdictColor,
              boxShadow: `0 0 8px ${verdictColor}`,
            }}
          />
          {/* Price marker */}
          <div
            className="absolute inset-y-1 w-1 rounded"
            style={{
              left: `${pricePct}%`,
              transform: 'translateX(-50%)',
              background: '#e2c97e',
              boxShadow: '0 0 8px #e2c97e80',
            }}
          />
          {/* Labels */}
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span className="text-[7px] font-mono" style={{ color: '#374151' }}>${low.toFixed(0)}</span>
            <span className="text-[7px] font-mono" style={{ color: '#374151' }}>${high.toFixed(0)}</span>
          </div>
        </div>

        <div className="flex justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded" style={{ background: verdictColor }} />
            <span className="text-[8px]" style={{ color: '#4b5563' }}>DCF Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded" style={{ background: '#e2c97e' }} />
            <span className="text-[8px]" style={{ color: '#4b5563' }}>Current Price</span>
          </div>
        </div>
      </div>

      {/* Upside/downside */}
      <div className="rounded border p-4 text-center" style={{ background: '#040404', borderColor: '#111' }}>
        <div className="text-[7px] font-black tracking-widest mb-1" style={{ color: '#374151' }}>
          {overvalued ? 'POTENTIAL DOWNSIDE' : 'POTENTIAL UPSIDE'}
        </div>
        <div className="text-[40px] font-black font-mono leading-none" style={{ color: verdictColor }}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
        </div>
        <div className="text-[9px] mt-1" style={{ color: '#4b5563' }}>
          {overvalued
            ? `Stock may be overpriced by $${(currentPrice - dcfValue).toFixed(2)} per share`
            : `Stock may be underpriced by $${(dcfValue - currentPrice).toFixed(2)} per share`}
        </div>

        {/* Upside bar */}
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: '#0a0a0a' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(absUpside, 100)}%`,
              background: verdictColor,
            }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[7px]" style={{ color: '#1f2937' }}>0%</span>
          <span className="text-[7px]" style={{ color: '#1f2937' }}>100%</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded border p-3" style={{ background: '#040404', borderColor: '#0a0a0a' }}>
        <div className="text-[7px] font-black tracking-widest mb-2" style={{ color: '#1f2937' }}>ABOUT DCF</div>
        <p className="text-[9px] leading-relaxed" style={{ color: '#374151' }}>
          DCF (Discounted Cash Flow) estimates a stock&apos;s intrinsic value based on projected future cash flows,
          discounted back to today&apos;s dollars. A stock trading below its DCF value may be undervalued;
          above DCF suggests the market is pricing in premium expectations.
        </p>
        <p className="text-[8px] mt-2 leading-relaxed" style={{ color: '#1f2937' }}>
          Note: DCF is a model-based estimate and should be used alongside other metrics. Accuracy depends
          on the quality of cash flow projections.
        </p>
      </div>
    </div>
  );
}
