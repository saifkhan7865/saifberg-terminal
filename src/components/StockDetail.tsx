'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QuoteData, FundamentalsData, SignalResult } from '@/lib/types';
import { calculateSignal } from '@/lib/signals';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Wifi, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import PriceChart from './PriceChart';
import FundamentalsPanel from './FundamentalsPanel';
import AIAnalysis from './AIAnalysis';
import CompanyNewsPanel from './CompanyNewsPanel';
import PeersPanel from './PeersPanel';
import EarningsPanel from './EarningsPanel';
import DividendsPanel from './DividendsPanel';
import TechnicalPanel from './TechnicalPanel';
import DCFPanel from './DCFPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

type Cmd = 'GP' | 'FA' | 'AI' | 'CN' | 'PEERS' | 'ERN' | 'DVD' | 'TA' | 'DCF';

interface CmdDef { label: string; code: string; color: string; }

const COMMANDS: Record<Cmd, CmdDef> = {
  GP:    { code: 'GP',    label: 'Chart',        color: '#f5a623' },
  FA:    { code: 'FA',    label: 'Fundamentals', color: '#e2c97e' },
  AI:    { code: 'AI',    label: 'AI Analysis',  color: '#a78bfa' },
  CN:    { code: 'CN',    label: 'News',         color: '#38bdf8' },
  PEERS: { code: 'PEERS', label: 'Peers',        color: '#34d399' },
  ERN:   { code: 'ERN',   label: 'Earnings',     color: '#fbbf24' },
  DVD:   { code: 'DVD',   label: 'Dividends',    color: '#4ade80' },
  TA:    { code: 'TA',    label: 'Technical',    color: '#22c55e' },
  DCF:   { code: 'DCF',   label: 'Valuation',   color: '#38bdf8' },
};

const CMD_ALIASES: Record<string, Cmd> = {
  GP: 'GP', CHART: 'GP', PRICE: 'GP', GPC: 'GP',
  FA: 'FA', FUND: 'FA', FUNDAMENTALS: 'FA', DES: 'FA',
  AI: 'AI', GEMINI: 'AI', PGFD: 'AI', ANALYZE: 'AI',
  CN: 'CN', NEWS: 'CN', CNEWS: 'CN',
  PEERS: 'PEERS', COMP: 'PEERS', PEER: 'PEERS',
  ERN: 'ERN', EARN: 'ERN', EARNINGS: 'ERN', ECAL: 'ERN',
  DVD: 'DVD', DIVS: 'DVD', DIVIDENDS: 'DVD', DIV: 'DVD',
  TA: 'TA', TECH: 'TA', TECHNICAL: 'TA', RSI: 'TA', MACD: 'TA',
  DCF: 'DCF', VALUATION: 'DCF', VAL: 'DCF', INTRINSIC: 'DCF',
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtPrice = (v: number | null | undefined, d = 2) => v == null ? '—' : v.toFixed(d);
const fmtPct   = (v: number | null | undefined) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtVol   = (v: number | null | undefined) => {
  if (v == null) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
};
const fmtMCap = (v: number | null | undefined) => {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
};

function QuoteStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-medium" style={{ color: '#6e7681' }}>{label}</span>
      <span className="text-[11px] font-mono font-bold" style={{ color: color || '#e6edf3' }}>{value}</span>
    </div>
  );
}

// ─── Command Bar ──────────────────────────────────────────────────────────────

function CommandBar({ symbol, activeCmd, onExecute }: {
  symbol: string; activeCmd: Cmd; onExecute: (cmd: Cmd) => void;
}) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Cmd[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolve = (v: string) => {
    const upper = v.trim().toUpperCase();
    const resolved = CMD_ALIASES[upper];
    if (resolved) { onExecute(resolved); setInput(''); setSuggestions([]); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') resolve(input);
    if (e.key === 'Escape') { setInput(''); setSuggestions([]); }
  };

  const handleChange = (v: string) => {
    setInput(v);
    if (v.trim().length > 0) {
      const upper = v.trim().toUpperCase();
      const matches = (Object.keys(CMD_ALIASES) as string[])
        .filter(k => k.startsWith(upper))
        .map(k => CMD_ALIASES[k])
        .filter((c, i, a) => a.indexOf(c) === i)
        .slice(0, 6);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const activeDef = COMMANDS[activeCmd];

  return (
    <div className="flex-shrink-0 border-b" style={{ borderColor: '#21262d', background: '#161b22' }}>
      {/* Breadcrumb + command input */}
      <div className="flex items-center gap-2 px-4 h-8 border-b" style={{ borderColor: '#21262d' }}>
        <span className="text-[10px] font-mono font-bold" style={{ color: '#6e7681' }}>{symbol}</span>
        <ChevronRight size={10} style={{ color: '#484f58' }} />
        <span className="text-[11px] font-black tracking-wide" style={{ color: activeDef.color }}>{activeDef.label}</span>
        <div className="flex-1" />
        {/* Command input */}
        <div className="relative flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
          <span className="text-[10px] font-bold font-mono" style={{ color: '#f5a623' }}>{'>'}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="type command…"
            className="bg-transparent outline-none text-[10px] font-mono w-24"
            style={{ color: '#e6edf3', caretColor: '#f5a623' }}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full right-0 mt-1 border rounded z-20 overflow-hidden" style={{ background: '#1c2128', borderColor: '#30363d', minWidth: 200 }}>
              {suggestions.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => { onExecute(cmd); setInput(''); setSuggestions([]); }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#21262d] transition-colors text-left"
                >
                  <span className="text-[9px] font-black font-mono w-10" style={{ color: '#484f58' }}>{COMMANDS[cmd].code}</span>
                  <span className="text-[11px] font-bold" style={{ color: COMMANDS[cmd].color }}>{COMMANDS[cmd].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex items-end gap-0 px-3 overflow-x-auto scrollbar-none" style={{ paddingTop: 6 }}>
        {(Object.keys(COMMANDS) as Cmd[]).map((cmd) => {
          const def = COMMANDS[cmd];
          const isActive = cmd === activeCmd;
          return (
            <button
              key={cmd}
              onClick={() => onExecute(cmd)}
              className="flex-shrink-0 flex flex-col items-center px-4 pb-2 pt-1 rounded-t transition-all"
              style={{
                borderBottom: `2px solid ${isActive ? def.color : 'transparent'}`,
                background: isActive ? `${def.color}12` : 'transparent',
                color: isActive ? def.color : '#8b949e',
                minWidth: 64,
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.background = '#21262d'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.background = 'transparent'; } }}
            >
              <span className="text-[8px] font-black tracking-widest opacity-60">{def.code}</span>
              <span className="text-[11px] font-bold leading-tight">{def.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  symbol: string;
  mobileCmd?: string;
}

export default function StockDetail({ symbol, mobileCmd }: Props) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [loadingFund, setLoadingFund] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeCmd, setActiveCmd] = useState<Cmd>('GP');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQuote = useCallback(async () => {
    setLoadingQuote(true);
    setError('');
    try {
      const res = await apiFetch(`/api/quote?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setQuote(null); }
      else { setQuote(data); setLastUpdated(new Date()); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally { setLoadingQuote(false); }
  }, [symbol]);

  const fetchFundamentals = useCallback(async () => {
    setLoadingFund(true);
    try {
      const res = await apiFetch(`/api/fundamentals?symbol=${symbol}`);
      const data = await res.json();
      if (!data.error) setFundamentals(data);
    } catch { /* non-fatal */ } finally { setLoadingFund(false); }
  }, [symbol]);

  useEffect(() => {
    setQuote(null);
    setFundamentals(null);
    setSignal(null);
    setActiveCmd('GP');
    fetchQuote();
    fetchFundamentals();
  }, [symbol, fetchQuote, fetchFundamentals]);

  useEffect(() => {
    if (mobileCmd) setActiveCmd(mobileCmd as Cmd);
  }, [mobileCmd]);

  useEffect(() => {
    if (fundamentals && quote) setSignal(calculateSignal(fundamentals, quote));
  }, [fundamentals, quote]);

  useEffect(() => {
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, [fetchQuote]);

  const isUp = (quote?.regularMarketChangePercent ?? 0) >= 0;
  const priceColor = isUp ? '#22c55e' : '#ef4444';

  if (error && !quote) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: '#374151' }}>
        <AlertCircle size={24} style={{ color: '#ef4444' }} />
        <span className="text-[12px] font-bold" style={{ color: '#ef4444' }}>{symbol} NOT FOUND</span>
        <span className="text-[10px]">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Quote Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: '#21262d', background: '#161b22' }}>
        {loadingQuote && !quote ? (
          <div className="space-y-1">
            <div className="h-5 w-48 rounded shimmer" />
            <div className="h-8 w-32 rounded shimmer" />
          </div>
        ) : quote ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                {/* Company logo */}
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ background: '#1c2128', border: '1px solid #30363d' }}>
                  <img
                    src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
                    alt={symbol}
                    className="w-full h-full object-contain p-1"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <span className="text-lg font-black tracking-widest glow-amber" style={{ color: '#f5a623' }}>{symbol}</span>
                <span className="text-[11px]" style={{ color: '#6b7280' }}>{quote.longName || quote.shortName || ''}</span>
                {quote.exchange && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: '#21262d', color: '#6e7681', border: '1px solid #30363d' }}>
                    {quote.exchange}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {quote.marketState && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full pulse-live" style={{ background: quote.marketState === 'REGULAR' ? '#22c55e' : '#f5a623' }} />
                    <span className="text-[9px] font-bold" style={{ color: quote.marketState === 'REGULAR' ? '#22c55e' : '#f5a623' }}>
                      {quote.marketState === 'REGULAR' ? 'LIVE' : quote.marketState}
                    </span>
                  </div>
                )}
                <button onClick={() => { fetchQuote(); fetchFundamentals(); }} className="p-0.5 rounded hover:bg-[#21262d]">
                  <RefreshCw size={10} style={{ color: loadingQuote ? '#f5a623' : '#4b5563' }} />
                </button>
              </div>
            </div>

            <div className="flex items-end gap-3 mb-2">
              <span className="text-3xl font-black font-mono leading-none" style={{ color: priceColor, textShadow: `0 0 20px ${priceColor}40` }}>
                {quote.currency === 'USD' || !quote.currency ? '$' : quote.currency + ' '}
                {fmtPrice(quote.regularMarketPrice)}
              </span>
              <div className="flex items-center gap-1.5 mb-0.5">
                {isUp ? <TrendingUp size={14} style={{ color: priceColor }} /> : <TrendingDown size={14} style={{ color: priceColor }} />}
                <span className="text-base font-bold font-mono" style={{ color: priceColor }}>{fmtPct(quote.regularMarketChangePercent)}</span>
                <span className="text-sm font-mono" style={{ color: priceColor, opacity: 0.8 }}>
                  ({quote.regularMarketChange != null ? (quote.regularMarketChange >= 0 ? '+' : '') + quote.regularMarketChange.toFixed(2) : '—'})
                </span>
              </div>
              {signal && (
                <div className={`ml-auto px-2 py-0.5 rounded text-[10px] font-black tracking-widest
                  ${signal.signal === 'STRONG BUY' ? 'signal-strong-buy' :
                    signal.signal === 'BUY' ? 'signal-buy' :
                    signal.signal === 'HOLD' ? 'signal-hold' :
                    signal.signal === 'SELL' ? 'signal-sell' : 'signal-strong-sell'}`}
                >
                  {signal.signal}
                </div>
              )}
            </div>

            <div className="grid gap-x-4 gap-y-1 pt-1 border-t" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', borderColor: '#21262d' }}>
              <QuoteStat label="OPEN"     value={`$${fmtPrice(quote.regularMarketOpen)}`} />
              <QuoteStat label="HIGH"     value={`$${fmtPrice(quote.regularMarketDayHigh)}`} color="#22c55e" />
              <QuoteStat label="LOW"      value={`$${fmtPrice(quote.regularMarketDayLow)}`}  color="#ef4444" />
              <QuoteStat label="VOLUME"   value={fmtVol(quote.regularMarketVolume)} />
              <QuoteStat label="AVG VOL"  value={fmtVol(quote.averageDailyVolume3Month)} />
              <QuoteStat label="MKT CAP"  value={fmtMCap(quote.marketCap)} />
              <QuoteStat label="52W LOW"  value={`$${fmtPrice(quote.fiftyTwoWeekLow)}`}  color="#ef4444" />
              <QuoteStat label="52W HIGH" value={`$${fmtPrice(quote.fiftyTwoWeekHigh)}`} color="#22c55e" />
              {fundamentals?.trailingPE && <QuoteStat label="P/E"   value={`${fundamentals.trailingPE.toFixed(1)}x`} />}
              {fundamentals?.dividendYield && <QuoteStat label="YIELD" value={`${(fundamentals.dividendYield * 100).toFixed(2)}%`} color="#22c55e" />}
            </div>

            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1 mt-1">
                <Wifi size={8} style={{ color: '#484f58' }} />
                <span className="text-[9px]" style={{ color: '#484f58' }}>{lastUpdated.toLocaleTimeString('en-US', { hour12: false })}</span>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Command Bar */}
      <CommandBar symbol={symbol} activeCmd={activeCmd} onExecute={setActiveCmd} />

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        {activeCmd === 'GP'    && <div className="h-full overflow-y-auto p-3"><PriceChart symbol={symbol} previousClose={quote?.regularMarketOpen ?? undefined} /></div>}
        {activeCmd === 'FA'    && <FundamentalsPanel fundamentals={fundamentals} quote={quote} signal={signal} loading={loadingFund} />}
        {activeCmd === 'AI'    && <AIAnalysis symbol={symbol} />}
        {activeCmd === 'CN'    && <CompanyNewsPanel symbol={symbol} />}
        {activeCmd === 'PEERS' && <PeersPanel symbol={symbol} onSelectTicker={() => {}} />}
        {activeCmd === 'ERN'   && <EarningsPanel symbol={symbol} />}
        {activeCmd === 'DVD'   && <DividendsPanel symbol={symbol} />}
        {activeCmd === 'TA'    && <TechnicalPanel symbol={symbol} />}
        {activeCmd === 'DCF'   && <DCFPanel symbol={symbol} />}
      </div>
    </div>
  );
}
