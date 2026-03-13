'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { format, parseISO, addDays, isToday, isTomorrow, startOfDay } from 'date-fns';

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
  if (v == null) return null;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
};

const scoreColor = (s: number) => s >= 8 ? '#22c55e' : s >= 6 ? '#f5a623' : '#8b949e';

function LogoCard({ entry, onSelect }: { entry: EarningsEntry; onSelect: (s: string) => void }) {
  const [imgOk, setImgOk] = useState(true);
  const eps = entry.epsEstimated;
  const rev = fmtRev(entry.revenueEstimated);
  const epsColor = eps == null ? '#6e7681' : eps > 0 ? '#22c55e' : '#ef4444';

  return (
    <div
      onClick={() => onSelect(entry.symbol)}
      className="flex flex-col items-center cursor-pointer rounded-lg p-2.5 transition-all group"
      style={{ background: '#1c2128', border: '1px solid #30363d', minWidth: 88, maxWidth: 100 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f5a62350'; e.currentTarget.style.background = '#21262d'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#1c2128'; }}
    >
      {/* Logo */}
      <div className="w-10 h-10 rounded-lg mb-1.5 overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{ background: '#161b22', border: '1px solid #21262d' }}>
        {imgOk ? (
          <img
            src={`https://financialmodelingprep.com/image-stock/${entry.symbol}.png`}
            alt={entry.symbol}
            className="w-full h-full object-contain p-1"
            onError={() => setImgOk(false)}
          />
        ) : (
          <span className="text-[10px] font-black" style={{ color: '#f5a623' }}>
            {entry.symbol.slice(0, 2)}
          </span>
        )}
      </div>

      {/* Ticker */}
      <span className="text-[10px] font-black leading-none mb-0.5 group-hover:text-[#f5a623] transition-colors"
        style={{ color: '#e2c97e' }}>
        {entry.symbol}
      </span>

      {/* EPS */}
      {eps != null && (
        <span className="text-[8px] font-bold" style={{ color: epsColor }}>
          {eps > 0 ? '+' : ''}{eps.toFixed(2)}
        </span>
      )}

      {/* Rev */}
      {rev && (
        <span className="text-[7px]" style={{ color: '#484f58' }}>{rev}</span>
      )}
    </div>
  );
}

function groupByDate(earnings: EarningsEntry[]): Record<string, EarningsEntry[]> {
  return earnings.reduce<Record<string, EarningsEntry[]>>((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});
}

export default function EarningsCalendar({ onSelect }: Props) {
  const [earnings, setEarnings]   = useState<EarningsEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [picks, setPicks]         = useState<EarningsPick[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState('');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week, etc.
  const [search, setSearch] = useState('');

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

  // Build the 5-day week window based on weekOffset
  const today = startOfDay(new Date());
  // Find Monday of current week
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const monday = addDays(today, (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + weekOffset * 7);
  const weekDays = [0, 1, 2, 3, 4].map(d => addDays(monday, d));

  const filteredEarnings = search.trim()
    ? earnings.filter(e => e.symbol.toUpperCase().includes(search.trim().toUpperCase()))
    : earnings;
  const grouped = groupByDate(filteredEarnings);

  const formatDayLabel = (d: Date) => {
    if (isToday(d)) return 'TODAY';
    if (isTomorrow(d)) return 'TOMORROW';
    return format(d, 'EEE').toUpperCase();
  };

  const weekLabel = weekOffset === 0
    ? `This Week · ${format(monday, 'MMM d')} – ${format(addDays(monday, 4), 'MMM d')}`
    : weekOffset === 1
      ? `Next Week · ${format(monday, 'MMM d')} – ${format(addDays(monday, 4), 'MMM d')}`
      : `${format(monday, 'MMM d')} – ${format(addDays(monday, 4), 'MMM d')}`;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#0d1117' }}>

      {/* ── LEFT: Calendar Grid ─────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden border-r" style={{ flex: '1 1 0', borderColor: '#21262d' }}>

        {/* Week nav header */}
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
          style={{ borderColor: '#21262d', background: '#161b22' }}>
          <div>
            <span className="text-[11px] font-black tracking-widest" style={{ color: '#8b949e' }}>
              EARNINGS CALENDAR
            </span>
            <span className="ml-2 text-[9px]" style={{ color: '#484f58' }}>{weekLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="flex items-center gap-1 px-2 py-1 rounded"
              style={{ background: '#1c2128', border: `1px solid ${search ? '#f5a62360' : '#30363d'}` }}>
              <Search size={9} style={{ color: search ? '#f5a623' : '#484f58', flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="SEARCH TICKER"
                className="bg-transparent outline-none text-[9px] font-bold w-24"
                style={{ color: '#e2c97e', caretColor: '#f5a623' }}
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X size={9} style={{ color: '#6e7681' }} />
                </button>
              )}
            </div>
            <span className="text-[9px]" style={{ color: '#484f58' }}>
              {search ? `${filteredEarnings.length} match` : `${earnings.length} total`}
            </span>
            <button onClick={() => setWeekOffset(v => v - 1)} disabled={weekOffset <= 0}
              className="p-1 rounded hover:bg-[#21262d] disabled:opacity-30 transition-colors"
              style={{ color: '#8b949e' }}>
              <ChevronLeft size={12} />
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="px-2 py-0.5 rounded text-[8px] font-bold transition-colors"
              style={{ background: weekOffset === 0 ? '#f5a62318' : 'transparent', color: weekOffset === 0 ? '#f5a623' : '#6e7681', border: `1px solid ${weekOffset === 0 ? '#f5a62340' : '#30363d'}` }}>
              TODAY
            </button>
            <button onClick={() => setWeekOffset(v => v + 1)}
              className="p-1 rounded hover:bg-[#21262d] transition-colors"
              style={{ color: '#8b949e' }}>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Search results — flat list */}
        {search.trim() && !loading && (
          <div className="flex-1 overflow-y-auto p-3">
            {filteredEarnings.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-[10px]" style={{ color: '#484f58' }}>No results for &ldquo;{search}&rdquo;</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredEarnings.map(e => (
                  <div key={`${e.symbol}-${e.date}`} className="flex flex-col items-center gap-0.5">
                    <span className="text-[7px] font-bold" style={{ color: '#484f58' }}>
                      {format(parseISO(e.date), 'MMM d')}
                    </span>
                    <LogoCard entry={e} onSelect={onSelect} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5-column day grid */}
        {!search.trim() && loading ? (
          <div className="flex flex-1 gap-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 border-r p-3 space-y-2" style={{ borderColor: '#21262d' }}>
                <div className="h-5 rounded shimmer mb-3" />
                {[...Array(3)].map((_, j) => <div key={j} className="h-20 rounded shimmer" />)}
              </div>
            ))}
          </div>
        ) : !search.trim() ? (
          <div className="flex flex-1 overflow-hidden">
            {weekDays.map((day, di) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEntries = grouped[dateKey] || [];
              const bmo = dayEntries.filter(e => e.time === 'bmo');
              const amc = dayEntries.filter(e => e.time === 'amc');
              const other = dayEntries.filter(e => !e.time || (e.time !== 'bmo' && e.time !== 'amc'));
              const isCurrentDay = isToday(day);

              return (
                <div key={dateKey}
                  className="flex-1 flex flex-col overflow-hidden border-r"
                  style={{ borderColor: '#21262d', background: isCurrentDay ? '#f5a62306' : 'transparent' }}>

                  {/* Day header */}
                  <div className="px-2 py-2 border-b flex-shrink-0" style={{ borderColor: '#21262d' }}>
                    <div className="text-[10px] font-black" style={{ color: isCurrentDay ? '#f5a623' : '#8b949e' }}>
                      {formatDayLabel(day)}
                    </div>
                    <div className="text-[9px]" style={{ color: '#484f58' }}>
                      {format(day, 'MMM d')}
                    </div>
                    {dayEntries.length > 0 && (
                      <div className="text-[8px] mt-0.5 font-bold" style={{ color: '#6e7681' }}>
                        {dayEntries.length} reports
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    {dayEntries.length === 0 ? (
                      <div className="flex items-center justify-center h-20">
                        <span className="text-[8px]" style={{ color: '#30363d' }}>—</span>
                      </div>
                    ) : (
                      <>
                        {/* Before Open */}
                        {bmo.length > 0 && (
                          <div>
                            <div className="text-[7px] font-black tracking-widest mb-1.5 flex items-center gap-1"
                              style={{ color: '#fbbf24' }}>
                              <span>🌅</span> BEFORE OPEN
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {bmo.map(e => <LogoCard key={e.symbol} entry={e} onSelect={onSelect} />)}
                            </div>
                          </div>
                        )}

                        {/* After Close */}
                        {amc.length > 0 && (
                          <div>
                            <div className="text-[7px] font-black tracking-widest mb-1.5 flex items-center gap-1"
                              style={{ color: '#38bdf8' }}>
                              <span>🌆</span> AFTER CLOSE
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {amc.map(e => <LogoCard key={e.symbol} entry={e} onSelect={onSelect} />)}
                            </div>
                          </div>
                        )}

                        {/* TBD */}
                        {other.length > 0 && (
                          <div>
                            <div className="text-[7px] font-black tracking-widest mb-1.5" style={{ color: '#484f58' }}>
                              TBD
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {other.map(e => <LogoCard key={e.symbol} entry={e} onSelect={onSelect} />)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ── RIGHT: AI Earnings Picks ────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: 280 }}>
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
          style={{ borderColor: '#21262d', background: '#161b22' }}>
          <div className="flex items-center gap-2">
            <Brain size={11} style={{ color: '#a78bfa' }} />
            <span className="text-[10px] font-black tracking-widest" style={{ color: '#a78bfa' }}>AI PICKS</span>
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
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full pulse-live" style={{ background: '#a78bfa' }} />
                <span className="text-[9px]" style={{ color: '#6e7681' }}>GEMINI ANALYZING EARNINGS...</span>
              </div>
              {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded shimmer" />)}
            </>
          ) : aiError ? (
            <div className="flex items-start gap-2 p-3 rounded" style={{ background: '#1f0505', border: '1px solid #3b0808' }}>
              <AlertTriangle size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="text-[10px] font-black mb-1" style={{ color: '#ef4444' }}>FAILED</div>
                <div className="text-[9px]" style={{ color: '#6b7280' }}>{aiError}</div>
              </div>
            </div>
          ) : picks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <Brain size={28} style={{ color: '#21262d' }} />
              <div className="text-center">
                <div className="text-[10px] font-black mb-1" style={{ color: '#484f58' }}>AI EARNINGS PICKS</div>
                <p className="text-[9px] leading-relaxed" style={{ color: '#30363d' }}>
                  Click ANALYZE to get AI-powered<br />picks based on the calendar<br />and current market news.
                </p>
              </div>
            </div>
          ) : (
            picks.map((pick, i) => (
              <div key={i}
                onClick={() => onSelect(pick.ticker)}
                className="rounded-lg border p-3 cursor-pointer transition-all"
                style={{ background: '#0a0614', border: '1px solid #2d1b69' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#0f0820'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2d1b69'; e.currentTarget.style.background = '#0a0614'; }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0"
                      style={{ background: '#161b22', border: '1px solid #21262d' }}>
                      <img
                        src={`https://financialmodelingprep.com/image-stock/${pick.ticker}.png`}
                        alt={pick.ticker}
                        className="w-full h-full object-contain p-0.5"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <div className="text-[15px] font-black leading-none" style={{ color: '#e2c97e' }}>
                        {pick.ticker}
                      </div>
                      <div className="text-[8px] mt-0.5 truncate max-w-[120px]" style={{ color: '#6e7681' }}>
                        {pick.company}
                      </div>
                    </div>
                  </div>
                  <div
                    className="text-[12px] font-black px-2 py-0.5 rounded"
                    style={{
                      color: scoreColor(pick.score),
                      background: `${scoreColor(pick.score)}18`,
                      border: `1px solid ${scoreColor(pick.score)}40`,
                    }}
                  >
                    {pick.score}/10
                  </div>
                </div>
                <p className="text-[9px] leading-relaxed" style={{ color: '#8b949e' }}>
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
