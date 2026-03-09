'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

interface EarningsEntry {
  symbol: string;
  date: string;
  epsEstimated: number | null;
  revenueEstimated: number | null;
  time?: string | null;
}

interface EarningsPick {
  ticker: string;
  company: string;
  score: number;
  reason: string;
}

interface Props {
  onSelect: (symbol: string) => void;
}

const fmtRev = (v: number | null) => {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
};

function groupByDate(earnings: EarningsEntry[]): Record<string, EarningsEntry[]> {
  return earnings.reduce<Record<string, EarningsEntry[]>>((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});
}

export default function EarningsCalendar({ onSelect }: Props) {
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [picks,    setPicks]    = useState<EarningsPick[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState('');

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/api/fmp/earnings-calendar');
      const data = await res.json() as { earnings: EarningsEntry[] };
      setEarnings(data.earnings || []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  const runAI = useCallback(async (earningsList: EarningsEntry[]) => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError('');
    try {
      const newsRes  = await apiFetch('/api/finnhub/news');
      const newsData = await newsRes.json() as { news: { headline: string; source: string }[] };
      const res = await apiFetch('/api/ai-earnings-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earnings: earningsList.slice(0, 30), news: newsData.news || [] }),
      });
      const data = await res.json() as { picks?: EarningsPick[]; error?: string };
      if (data.error) setAiError(data.error);
      else setPicks(data.picks || []);
    } catch { setAiError('AI analysis failed'); }
    finally { setAiLoading(false); }
  }, [aiLoading]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const grouped = groupByDate(earnings);
  const sortedDates = Object.keys(grouped).sort();

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const scoreColor = (s: number) => s >= 8 ? '#22c55e' : s >= 6 ? '#f5a623' : '#9ca3af';

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#000' }}>

      {/* Left: Earnings Table (60%) */}
      <div className="flex flex-col overflow-hidden border-r" style={{ width: '60%', borderColor: '#111' }}>
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
          style={{ borderColor: '#111', background: '#020202' }}>
          <div className="text-[9px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>
            EARNINGS CALENDAR — NEXT 14 DAYS
          </div>
          <span className="text-[8px]" style={{ color: '#1f2937' }}>
            {earnings.length} companies reporting
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(12)].map((_, i) => <div key={i} className="h-9 rounded shimmer" />)}
            </div>
          ) : earnings.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-[9px]" style={{ color: '#1f2937' }}>No earnings data available</span>
            </div>
          ) : (
            <div>
              {sortedDates.map(date => (
                <div key={date}>
                  {/* Date header */}
                  <div className="sticky top-0 px-4 py-1.5 border-b"
                    style={{ background: '#050505', borderColor: '#0a0a0a' }}>
                    <span className="text-[9px] font-black tracking-widest" style={{ color: '#f5a623' }}>
                      {formatDate(date)}
                    </span>
                    <span className="ml-2 text-[7px]" style={{ color: '#374151' }}>
                      {grouped[date].length} reports
                    </span>
                  </div>

                  {/* Header row */}
                  <div className="flex items-center px-4 py-1 border-b" style={{ borderColor: '#060606' }}>
                    <div className="flex-1 text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>SYMBOL</div>
                    <div className="w-24 text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>EPS EST</div>
                    <div className="w-28 text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>REV EST</div>
                    <div className="w-16 text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>TIME</div>
                  </div>

                  {grouped[date].map(e => {
                    const epsColor = e.epsEstimated == null ? '#4b5563'
                      : e.epsEstimated > 0 ? '#22c55e' : '#ef4444';
                    return (
                      <div key={e.symbol} onClick={() => onSelect(e.symbol)}
                        className="flex items-center px-4 py-2 cursor-pointer hover:bg-[#080808] transition-colors border-b"
                        style={{ borderColor: '#040404' }}
                      >
                        <div className="flex-1">
                          <span className="text-[11px] font-black" style={{ color: '#e2c97e' }}>{e.symbol}</span>
                        </div>
                        <div className="w-24 text-right">
                          <span className="text-[10px] font-mono font-bold" style={{ color: epsColor }}>
                            {e.epsEstimated != null ? `$${e.epsEstimated.toFixed(2)}` : '—'}
                          </span>
                        </div>
                        <div className="w-28 text-right">
                          <span className="text-[9px] font-mono" style={{ color: '#9ca3af' }}>
                            {fmtRev(e.revenueEstimated)}
                          </span>
                        </div>
                        <div className="w-16 text-right">
                          <span className="text-[8px]" style={{ color: '#374151' }}>
                            {e.time === 'bmo' ? 'Pre-mkt' : e.time === 'amc' ? 'After' : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Earnings Picks (40%) */}
      <div className="flex flex-col overflow-hidden" style={{ width: '40%' }}>
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
          style={{ borderColor: '#111', background: '#020202' }}>
          <div className="flex items-center gap-2">
            <Brain size={11} style={{ color: '#a78bfa' }} />
            <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: '#a78bfa' }}>AI EARNINGS PICKS</span>
          </div>
          <button
            onClick={() => runAI(earnings)}
            disabled={aiLoading || loading}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black tracking-widest disabled:opacity-40 transition-all"
            style={{ background: '#160d33', border: '1px solid #4c1d95', color: '#a78bfa' }}
          >
            <RefreshCw size={8} className={aiLoading ? 'animate-spin' : ''} />
            {aiLoading ? 'ANALYZING...' : picks.length > 0 ? 'REFRESH' : 'ANALYZE'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {aiLoading ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full pulse-live" style={{ background: '#a78bfa' }} />
                <span className="text-[9px]" style={{ color: '#374151' }}>GEMINI ANALYZING EARNINGS...</span>
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded shimmer" />
              ))}
            </>
          ) : aiError ? (
            <div className="flex items-start gap-2 p-3 rounded" style={{ background: '#1f0505', border: '1px solid #3b0808' }}>
              <AlertTriangle size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="text-[10px] font-black mb-1" style={{ color: '#ef4444' }}>ANALYSIS FAILED</div>
                <div className="text-[9px]" style={{ color: '#6b7280' }}>{aiError}</div>
              </div>
            </div>
          ) : picks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <Brain size={32} style={{ color: '#1e1033' }} />
              <div className="text-center">
                <div className="text-[10px] font-black mb-1" style={{ color: '#2a2a2a' }}>AI EARNINGS ANALYSIS</div>
                <p className="text-[9px] leading-relaxed" style={{ color: '#1f2937' }}>
                  Click ANALYZE to get AI-powered earnings picks<br />based on calendar and market news.
                </p>
              </div>
            </div>
          ) : (
            picks.map((pick, i) => (
              <div key={i}
                onClick={() => onSelect(pick.ticker)}
                className="rounded border p-3 cursor-pointer hover:brightness-110 transition-all"
                style={{ background: '#0a0614', border: '1px solid #2d1b69' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[18px] font-black leading-none" style={{ color: '#e2c97e' }}>
                      {pick.ticker}
                    </div>
                    <div className="text-[8px] mt-0.5 truncate max-w-[140px]" style={{ color: '#6b7280' }}>
                      {pick.company}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className="text-[11px] font-black px-2 py-0.5 rounded"
                      style={{
                        color: scoreColor(pick.score),
                        background: `${scoreColor(pick.score)}18`,
                        border: `1px solid ${scoreColor(pick.score)}40`,
                      }}
                    >
                      {pick.score}/10
                    </div>
                    <span className="text-[7px] font-black tracking-widest" style={{ color: '#a78bfa' }}>
                      EARNINGS PICK
                    </span>
                  </div>
                </div>
                <p className="text-[9px] leading-snug" style={{ color: '#9ca3af' }}>
                  {pick.reason}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
