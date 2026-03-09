'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Brain, RefreshCw,
  Zap, AlertTriangle, Eye, Clock, Activity, ChevronLeft, BarChart2,
} from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import MacroDashboard from './MacroDashboard';
import EarningsCalendar from './EarningsCalendar';
import StockScreener from './StockScreener';
import AIPicker from './AIPicker';

// ─── Market Status ────────────────────────────────────────────────────────────
function getMarketStatus(): { label: string; color: string; detail: string } {
  const now = new Date();
  const et  = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day  = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();
  if (day === 0 || day === 6)
    return { label: 'CLOSED', color: '#6b7280', detail: 'Weekend · Opens Mon 9:30 AM ET' };
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) {
    const rem = 16 * 60 - mins;
    return { label: 'MARKET OPEN', color: '#22c55e', detail: `Closes in ${Math.floor(rem / 60)}h ${rem % 60}m ET` };
  }
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) {
    const rem = 9 * 60 + 30 - mins;
    return { label: 'PRE-MARKET', color: '#f5a623', detail: `Opens in ${Math.floor(rem / 60)}h ${rem % 60}m ET` };
  }
  if (mins >= 16 * 60 && mins < 20 * 60)
    return { label: 'AFTER HOURS', color: '#f5a623', detail: 'Extended hours active' };
  return { label: 'CLOSED', color: '#6b7280', detail: 'Pre-market opens 4:00 AM ET' };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuoteMini  { symbol: string; price: number; changesPercentage: number; }
interface Mover      { symbol: string; shortName: string; price: number | null; changePercent: number | null; volume: number | null; }
interface Sector     { symbol: string; fmpSector: string; name: string; shortName: string; changePercent: number | null; change1M: number | null; }
interface SectorStock{ symbol: string; name: string; marketCap: number; price: number; volume: number; beta: number; industry: string; }
interface FHNews     { datetime: number; headline: string; source: string; url: string; }
interface MarketAI   { mood: string; sectors: { name: string; reason: string }[]; topStock: { ticker: string; reason: string } | null; catalysts: string[]; risk: string; prediction: string; }
type MoverTab = 'gainers' | 'losers' | 'actives';

// ─── Index meta ───────────────────────────────────────────────────────────────
const INDEX_META = [
  { symbol: 'SPY',     label: 'S&P 500',    color: '#4ade80' },
  { symbol: 'QQQ',     label: 'NASDAQ 100', color: '#38bdf8' },
  { symbol: 'DIA',     label: 'DOW JONES',  color: '#f5a623' },
  { symbol: 'IWM',     label: 'RUSSELL 2K', color: '#a78bfa' },
  { symbol: '^VIX',   label: 'VIX',        color: '#f472b6' },
  { symbol: 'GLD',    label: 'GOLD',       color: '#fbbf24' },
  { symbol: 'BTCUSD', label: 'BITCOIN',    color: '#fb923c' },
];

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtPrice = (v: number | null) => {
  if (v == null) return '—';
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1000)  return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return v.toFixed(2);
};
const fmtPct = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtVol = (v: number | null) => {
  if (!v) return '';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return `${(v / 1e3).toFixed(0)}K`;
};
const fmtB = (v: number) => {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
};

// ─── AI Parser ────────────────────────────────────────────────────────────────
function parseMarketAI(text: string): MarketAI {
  const result: MarketAI = { mood: '', sectors: [], topStock: null, catalysts: [], risk: '', prediction: '' };
  let section = '';
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (line.startsWith('MARKET MOOD'))    { section = 'mood';       continue; }
    if (line.startsWith('SECTOR TO WATCH')){ section = 'sector';     continue; }
    if (line.startsWith('TOP STOCK'))      { section = 'stock';      continue; }
    if (line.startsWith('KEY CATALYSTS'))  { section = 'catalyst';   continue; }
    if (line.startsWith('RISK ALERT'))     { section = 'risk';       continue; }
    if (line.startsWith('MARKET PREDICTION')){ section = 'prediction'; continue; }
    if (section === 'mood')       result.mood += (result.mood ? ' ' : '') + line;
    else if (section === 'sector' && line.includes(':')) {
      const col = line.indexOf(':');
      result.sectors.push({ name: line.slice(0, col).trim(), reason: line.slice(col + 1).trim() });
    } else if (section === 'stock' && line.includes(':')) {
      const col = line.indexOf(':');
      result.topStock = { ticker: line.slice(0, col).trim(), reason: line.slice(col + 1).trim() };
    } else if (section === 'catalyst' && line.startsWith('[~]')) {
      result.catalysts.push(line.slice(3).trim());
    } else if (section === 'risk')       { result.risk += (result.risk ? ' ' : '') + line; }
    else if (section === 'prediction')   { result.prediction += (result.prediction ? ' ' : '') + line; }
  }
  return result;
}

// ─── Sector Row ───────────────────────────────────────────────────────────────
function SectorRow({ sector, onClick, isActive }: { sector: Sector; onClick: () => void; isActive: boolean }) {
  const pct  = sector.changePercent ?? 0;
  const pct1M = sector.change1M;
  const color = pct >= 0.5 ? '#4ade80' : pct >= 0 ? '#86efac' : pct >= -0.5 ? '#fca5a5' : '#ef4444';
  const fillBg = pct >= 0 ? '#16a34a' : '#b91c1c';
  const barW  = Math.min(Math.abs(pct) * 20, 100);
  const c1M   = pct1M == null ? '#374151' : pct1M >= 0 ? '#4ade80' : '#ef4444';
  return (
    <div onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b"
      style={{ borderColor: '#080808', background: isActive ? '#0a0a0a' : 'transparent',
        borderLeft: isActive ? '2px solid #f5a623' : '2px solid transparent' }}
    >
      <div className="w-[42px] text-[9px] font-black flex-shrink-0" style={{ color: isActive ? '#f5a623' : '#9ca3af' }}>
        {sector.shortName}
      </div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#111' }}>
        <div className="h-full rounded-full" style={{ width: `${barW}%`, background: fillBg }} />
      </div>
      <div className="w-[52px] text-right text-[10px] font-black font-mono flex-shrink-0" style={{ color }}>
        {fmtPct(pct)}
      </div>
      <div className="w-[48px] text-right text-[9px] font-mono flex-shrink-0" style={{ color: c1M }}>
        {pct1M != null ? `${pct1M >= 0 ? '+' : ''}${pct1M.toFixed(1)}%` : '—'}
      </div>
    </div>
  );
}

// ─── Tab definitions ─────────────────────────────────────────────────────────
type HomeTab = 'OVERVIEW' | 'MACRO' | 'EARNINGS' | 'SCREENER' | 'PICK';

const HOME_TABS: { id: HomeTab; label: string; icon: string; color: string }[] = [
  { id: 'OVERVIEW', label: 'OVERVIEW',    icon: '⊙', color: '#f5a623' },
  { id: 'MACRO',    label: 'MACRO',       icon: '📊', color: '#38bdf8' },
  { id: 'EARNINGS', label: 'EARNINGS',    icon: '📅', color: '#fbbf24' },
  { id: 'SCREENER', label: 'SCREENER',    icon: '⊗', color: '#4ade80' },
  { id: 'PICK',     label: 'PICK A STOCK',icon: '🧠', color: '#a78bfa' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props { onSelect: (symbol: string) => void }

export default function HomeBoard({ onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<HomeTab>('OVERVIEW');
  const [quotes,       setQuotes]       = useState<Record<string, QuoteMini>>({});
  const [sectors,      setSectors]      = useState<Sector[]>([]);
  const [gainers,      setGainers]      = useState<Mover[]>([]);
  const [losers,       setLosers]       = useState<Mover[]>([]);
  const [actives,      setActives]      = useState<Mover[]>([]);
  const [news,         setNews]         = useState<FHNews[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [moverTab,     setMoverTab]     = useState<MoverTab>('gainers');

  // Sector drill-down
  const [activeSector,     setActiveSector]     = useState<Sector | null>(null);
  const [sectorStocks,     setSectorStocks]     = useState<SectorStock[]>([]);
  const [loadingSectorStocks, setLoadingSectorStocks] = useState(false);

  // AI
  const [aiResult,  setAiResult]  = useState<MarketAI | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState('');
  const hasRunAI = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const allSyms = INDEX_META.map(m => m.symbol);
    const [qRes, sRes, mRes, nRes] = await Promise.allSettled([
      apiFetch(`/api/quotes-batch?symbols=${allSyms.join(',')}`).then(r => r.json()),
      apiFetch('/api/fmp/sector-perf').then(r => r.json()),
      apiFetch('/api/market').then(r => r.json()),
      apiFetch('/api/finnhub/news').then(r => r.json()),
    ]);
    if (qRes.status === 'fulfilled') {
      const map: Record<string, QuoteMini> = {};
      for (const q of (qRes.value.quotes || [])) map[q.symbol] = q;
      setQuotes(map);
    }
    if (sRes.status === 'fulfilled') setSectors(sRes.value.sectors || []);
    if (mRes.status === 'fulfilled') {
      setGainers(mRes.value.gainers || []);
      setLosers(mRes.value.losers   || []);
      setActives(mRes.value.actives || []);
    }
    if (nRes.status === 'fulfilled') setNews(nRes.value.news || []);
    setLoading(false);
  }, []);

  const loadSectorStocks = useCallback(async (sector: Sector) => {
    setActiveSector(sector);
    setSectorStocks([]);
    setLoadingSectorStocks(true);
    try {
      const res  = await apiFetch(`/api/fmp/sector-stocks?sector=${encodeURIComponent(sector.fmpSector)}`);
      const data = await res.json();
      setSectorStocks(data.stocks || []);
    } catch { /* noop */ }
    finally { setLoadingSectorStocks(false); }
  }, []);

  const runAI = useCallback(async (
    currentSectors: Sector[], currentNews: FHNews[], currentQuotes: Record<string, QuoteMini>
  ) => {
    if (aiLoading) return;
    setAiLoading(true); setAiError('');
    try {
      const indices = INDEX_META.slice(0, 4).map(m => ({
        label: m.label,
        price: currentQuotes[m.symbol]?.price ?? 0,
        changesPercentage: currentQuotes[m.symbol]?.changesPercentage ?? 0,
      }));
      const sectorsWithTrend = currentSectors.map(s => ({
        name: s.name, shortName: s.shortName,
        changePercent: s.changePercent,
        change1M: s.change1M,
      }));
      const res  = await apiFetch('/api/ai-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectors: sectorsWithTrend, news: currentNews, indices }),
      });
      const data = await res.json();
      if (data.error) setAiError(data.error);
      else setAiResult(parseMarketAI(data.analysis || ''));
    } catch { setAiError('AI analysis failed'); }
    finally { setAiLoading(false); }
  }, [aiLoading]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!loading && !hasRunAI.current && sectors.length > 0 && news.length > 0) {
      hasRunAI.current = true;
      runAI(sectors, news, quotes);
    }
  }, [loading, sectors, news, quotes, runAI]);

  const mktStatus     = getMarketStatus();
  const currentMovers = moverTab === 'gainers' ? gainers : moverTab === 'losers' ? losers : actives;
  const moverColors: Record<MoverTab, string> = { gainers: '#22c55e', losers: '#ef4444', actives: '#f5a623' };
  const moverLabels: Record<MoverTab, string> = { gainers: '▲ GAINERS', losers: '▼ LOSERS', actives: '⊙ MOST ACTIVE' };

  // AI sector recommendation
  const aiSectorRec = aiResult?.sectors?.[0]?.name;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#000' }}>

      {/* ══ TOP: Status + Index Ticker ════════════════════════════════ */}
      <div className="flex-shrink-0" style={{ background: '#020202', borderBottom: '1px solid #111' }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b" style={{ borderColor: '#0a0a0a' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: mktStatus.color, boxShadow: mktStatus.label === 'MARKET OPEN' ? `0 0 6px ${mktStatus.color}` : 'none' }} />
              <span className="text-[9px] font-black tracking-[0.18em]" style={{ color: mktStatus.color }}>{mktStatus.label}</span>
            </div>
            <span className="text-[9px]" style={{ color: '#374151' }}>{mktStatus.detail}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] mr-1" style={{ color: '#1f2937' }}>QUICK JUMP</span>
            {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'META', 'AMZN', 'BTCUSD'].map(s => (
              <button key={s} onClick={() => onSelect(s)}
                className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide hover:bg-[#1a1000] transition-all"
                style={{ border: '1px solid #1f1f1f', color: '#e2c97e' }}
              >{s}</button>
            ))}
          </div>
        </div>
        {/* Index ticker */}
        <div className="flex">
          {INDEX_META.map(({ symbol, label, color }) => {
            const q  = quotes[symbol];
            const up = (q?.changesPercentage ?? 0) >= 0;
            return (
              <div key={symbol} onClick={() => onSelect(symbol)}
                className="flex-1 px-3 py-2.5 cursor-pointer hover:bg-[#080808] transition-all border-r"
                style={{ borderColor: '#0d0d0d' }}
              >
                <div className="text-[7px] font-black tracking-[0.15em] mb-0.5" style={{ color: '#374151' }}>{label}</div>
                {loading ? (
                  <div className="space-y-1"><div className="h-4 rounded shimmer" /><div className="h-2.5 w-3/4 rounded shimmer" /></div>
                ) : (
                  <>
                    <div className="text-[15px] font-black font-mono leading-none" style={{ color: q ? color : '#2a2a2a' }}>
                      {q ? `$${fmtPrice(q.price)}` : '—'}
                    </div>
                    <div className="text-[9px] font-bold flex items-center gap-0.5 mt-0.5"
                      style={{ color: q ? (up ? '#22c55e' : '#ef4444') : '#2a2a2a' }}>
                      {q && (up ? <TrendingUp size={8} /> : <TrendingDown size={8} />)}
                      {q ? fmtPct(q.changesPercentage) : '—'}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ TAB BAR ══════════════════════════════════════════════════ */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: '#111', background: '#010101' }}>
        {HOME_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-2 text-[9px] font-black tracking-[0.15em] transition-all flex items-center gap-1.5"
            style={{
              borderBottom: `2px solid ${activeTab === tab.id ? tab.color : 'transparent'}`,
              color: activeTab === tab.id ? tab.color : '#374151',
              background: activeTab === tab.id ? `${tab.color}08` : 'transparent',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB CONTENT ══════════════════════════════════════════════ */}
      {activeTab === 'MACRO' && (
        <div className="flex-1 overflow-hidden">
          <MacroDashboard />
        </div>
      )}
      {activeTab === 'EARNINGS' && (
        <div className="flex-1 overflow-hidden">
          <EarningsCalendar onSelect={onSelect} />
        </div>
      )}
      {activeTab === 'SCREENER' && (
        <div className="flex-1 overflow-hidden">
          <StockScreener onSelect={onSelect} />
        </div>
      )}
      {activeTab === 'PICK' && (
        <div className="flex-1 overflow-hidden">
          <AIPicker onSelect={onSelect} />
        </div>
      )}

      {/* ══ MAIN 3-COLUMN BODY ══════════════════════════════════════ */}
      <div className={`flex flex-1 overflow-hidden${activeTab !== 'OVERVIEW' ? ' hidden' : ''}`} style={{ minHeight: 0 }}>

        {/* ── LEFT: Sectors ──────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col overflow-hidden border-r" style={{ width: 210, borderColor: '#111' }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#111' }}>
            <span className="text-[8px] font-black tracking-[0.2em]" style={{ color: '#4b5563' }}>SECTOR PERFORMANCE</span>
            <div className="flex gap-2">
              <span className="text-[7px] font-bold" style={{ color: '#1f2937' }}>TODAY</span>
              <span className="text-[7px] font-bold" style={{ color: '#1f2937' }}>1M</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && sectors.length === 0 ? (
              <div className="p-2 space-y-1">
                {[...Array(11)].map((_, i) => <div key={i} className="h-8 rounded shimmer" />)}
              </div>
            ) : sectors.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[8px]" style={{ color: '#1f2937' }}>NO DATA</span>
              </div>
            ) : (
              <>
                {/* AI recommended sector badge */}
                {aiSectorRec && (
                  <div className="px-3 py-1.5 border-b" style={{ borderColor: '#0a0a0a', background: '#060600' }}>
                    <div className="flex items-center gap-1">
                      <Brain size={8} style={{ color: '#a78bfa' }} />
                      <span className="text-[7px] font-black tracking-widest" style={{ color: '#a78bfa' }}>AI PICK</span>
                    </div>
                    <div className="text-[9px] font-black mt-0.5" style={{ color: '#fbbf24' }}>{aiSectorRec}</div>
                  </div>
                )}
                {sectors
                  .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
                  .map(s => (
                    <SectorRow key={s.symbol} sector={s}
                      isActive={activeSector?.symbol === s.symbol}
                      onClick={() => activeSector?.symbol === s.symbol ? setActiveSector(null) : loadSectorStocks(s)}
                    />
                  ))
                }
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: Movers OR Sector Stocks ────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ borderColor: '#111', minWidth: 0 }}>

          {activeSector ? (
            /* Sector Stocks drill-down */
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#111', background: '#030303' }}>
                <button onClick={() => setActiveSector(null)}
                  className="flex items-center gap-1 text-[8px] font-bold hover:opacity-70 transition-opacity"
                  style={{ color: '#374151' }}
                >
                  <ChevronLeft size={11} /> BACK
                </button>
                <div className="flex items-center gap-2">
                  <BarChart2 size={11} style={{ color: '#f5a623' }} />
                  <span className="text-[10px] font-black tracking-widest" style={{ color: '#f5a623' }}>
                    {activeSector.name.toUpperCase()} — TOP STOCKS
                  </span>
                  <span className="text-[8px] font-bold" style={{ color: activeSector.changePercent != null && activeSector.changePercent >= 0 ? '#22c55e' : '#ef4444' }}>
                    {fmtPct(activeSector.changePercent)} TODAY
                  </span>
                  {activeSector.change1M != null && (
                    <span className="text-[8px]" style={{ color: '#374151' }}>
                      · {fmtPct(activeSector.change1M)} 1M
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingSectorStocks ? (
                  <div className="p-3 space-y-2">
                    {[...Array(10)].map((_, i) => <div key={i} className="h-11 rounded shimmer" />)}
                  </div>
                ) : sectorStocks.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[9px]" style={{ color: '#1f2937' }}>NO DATA</span>
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="flex items-center px-4 py-1 border-b" style={{ borderColor: '#080808' }}>
                      <div className="w-5 flex-shrink-0" />
                      <div className="flex-1 text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>SYMBOL / COMPANY</div>
                      <div className="w-[90px] text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>MKT CAP</div>
                      <div className="w-[70px] text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>PRICE</div>
                      <div className="w-[55px] text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>BETA</div>
                      <div className="w-[70px] text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>VOLUME</div>
                    </div>
                    {sectorStocks.map((s, i) => (
                      <div key={s.symbol} onClick={() => onSelect(s.symbol)}
                        className="flex items-center px-4 py-2.5 cursor-pointer hover:bg-[#080808] transition-colors border-b"
                        style={{ borderColor: '#050505' }}
                      >
                        <div className="w-5 text-[9px] font-mono flex-shrink-0" style={{ color: '#1f2937' }}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-black leading-none" style={{ color: '#e2c97e' }}>{s.symbol}</div>
                          <div className="text-[8px] truncate mt-0.5 max-w-[180px]" style={{ color: '#374151' }}>{s.industry}</div>
                        </div>
                        <div className="w-[90px] text-right text-[10px] font-mono font-bold" style={{ color: '#c9b97a' }}>
                          {fmtB(s.marketCap)}
                        </div>
                        <div className="w-[70px] text-right text-[10px] font-mono" style={{ color: '#9ca3af' }}>
                          ${fmtPrice(s.price)}
                        </div>
                        <div className="w-[55px] text-right text-[9px] font-mono"
                          style={{ color: s.beta > 1.5 ? '#f87171' : s.beta > 1 ? '#fbbf24' : '#4ade80' }}>
                          {s.beta?.toFixed(2) ?? '—'}
                        </div>
                        <div className="w-[70px] text-right text-[9px] flex items-center justify-end gap-0.5" style={{ color: '#374151' }}>
                          <Activity size={8} />{fmtVol(s.volume)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Market Movers */
            <>
              <div className="flex border-b flex-shrink-0" style={{ borderColor: '#111' }}>
                {(['gainers', 'losers', 'actives'] as MoverTab[]).map(t => (
                  <button key={t} onClick={() => setMoverTab(t)}
                    className="px-5 py-2 text-[9px] font-black tracking-[0.15em] transition-all"
                    style={{
                      borderBottom: `2px solid ${moverTab === t ? moverColors[t] : 'transparent'}`,
                      color: moverTab === t ? moverColors[t] : '#374151',
                      background: moverTab === t ? `${moverColors[t]}0a` : 'transparent',
                    }}
                  >{moverLabels[t]}</button>
                ))}
                <div className="flex-1" />
                <button onClick={fetchData} disabled={loading}
                  className="px-3 flex items-center gap-1 text-[8px] font-bold disabled:opacity-40"
                  style={{ color: '#2a2a2a' }}
                >
                  <RefreshCw size={9} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-3 space-y-2">
                    {[...Array(10)].map((_, i) => <div key={i} className="h-11 rounded shimmer" />)}
                  </div>
                ) : currentMovers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Clock size={22} style={{ color: '#1f2937' }} />
                    <div className="text-center">
                      <div className="text-[11px] font-black mb-1" style={{ color: '#2a2a2a' }}>{mktStatus.label}</div>
                      <div className="text-[9px]" style={{ color: '#1f2937' }}>Mover data available during market hours</div>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="flex items-center px-4 py-1 border-b" style={{ borderColor: '#080808' }}>
                      <div className="w-5 flex-shrink-0" />
                      <div className="flex-1 text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>SYMBOL</div>
                      <div className="w-[80px] text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>CHANGE</div>
                      <div className="w-[80px] text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>PRICE</div>
                      <div className="w-[60px] text-right text-[7px] font-black tracking-widest" style={{ color: '#1f2937' }}>VOLUME</div>
                    </div>
                    {currentMovers.slice(0, 15).map((m, i) => {
                      const up  = (m.changePercent ?? 0) >= 0;
                      const c   = up ? '#22c55e' : '#ef4444';
                      const barW = Math.min(Math.abs(m.changePercent ?? 0) * 8, 100);
                      return (
                        <div key={m.symbol} onClick={() => onSelect(m.symbol)}
                          className="relative flex items-center px-4 py-2.5 cursor-pointer hover:bg-[#080808] transition-colors border-b overflow-hidden"
                          style={{ borderColor: '#050505' }}
                        >
                          <div className="absolute inset-y-0 left-0 opacity-[0.04]" style={{ width: `${barW}%`, background: c }} />
                          <div className="relative w-5 text-[9px] font-mono flex-shrink-0" style={{ color: '#1f2937' }}>{i + 1}</div>
                          <div className="relative flex-1 min-w-0">
                            <div className="text-[12px] font-black leading-none" style={{ color: '#e2c97e' }}>{m.symbol}</div>
                            <div className="text-[8px] truncate mt-0.5 max-w-[140px]" style={{ color: '#374151' }}>{m.shortName}</div>
                          </div>
                          <div className="relative w-[80px] text-right">
                            <div className="text-[13px] font-black font-mono" style={{ color: c }}>{fmtPct(m.changePercent)}</div>
                          </div>
                          <div className="relative w-[80px] text-right">
                            <div className="text-[11px] font-mono" style={{ color: '#9ca3af' }}>${fmtPrice(m.price)}</div>
                          </div>
                          <div className="relative w-[60px] text-right">
                            <div className="flex items-center justify-end gap-0.5 text-[9px]" style={{ color: '#374151' }}>
                              <Activity size={8} />{fmtVol(m.volume)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: AI Market Brief ──────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 360 }}>
          <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
            style={{ borderColor: '#111', background: '#020202' }}>
            <div className="flex items-center gap-1.5">
              <Brain size={11} style={{ color: '#a78bfa' }} />
              <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: '#a78bfa' }}>AI MARKET BRIEF</span>
            </div>
            <button onClick={() => runAI(sectors, news, quotes)} disabled={aiLoading}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black tracking-widest disabled:opacity-40 transition-all"
              style={{ background: '#160d33', border: '1px solid #4c1d95', color: '#a78bfa' }}
            >
              <RefreshCw size={8} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'ANALYZING...' : 'REFRESH'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {aiLoading ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full pulse-live" style={{ background: '#a78bfa' }} />
                  <span className="text-[9px]" style={{ color: '#374151' }}>GEMINI ANALYZING MARKET DATA...</span>
                </div>
                {[95, 80, 90, 65, 100, 72, 85, 60, 90].map((w, i) => (
                  <div key={i} className="h-3 rounded shimmer" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : aiError ? (
              <div className="p-4 flex items-start gap-2">
                <AlertTriangle size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div className="text-[10px] font-black mb-1" style={{ color: '#ef4444' }}>ANALYSIS UNAVAILABLE</div>
                  <div className="text-[9px] leading-snug" style={{ color: '#4b5563' }}>{aiError}</div>
                </div>
              </div>
            ) : !aiResult ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                <Brain size={28} style={{ color: '#1e1033' }} />
                <p className="text-[9px] text-center leading-relaxed" style={{ color: '#1f2937' }}>
                  AI market brief auto-loads on startup.<br />Requires a Gemini API key.
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2.5">

                {/* Market prediction — top card */}
                {aiResult.prediction && (
                  <div className="rounded-lg p-3" style={{ background: '#0d0820', border: '1px solid #4c1d95' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap size={9} style={{ color: '#a78bfa' }} />
                      <span className="text-[7px] font-black tracking-[0.25em]" style={{ color: '#a78bfa' }}>MARKET PREDICTION</span>
                    </div>
                    <p className="text-[10px] leading-relaxed font-medium" style={{ color: '#c4b5fd' }}>{aiResult.prediction}</p>
                  </div>
                )}

                {/* Market mood */}
                {aiResult.mood && (
                  <div className="rounded-lg p-3" style={{ background: '#060606', border: '1px solid #111' }}>
                    <div className="text-[7px] font-black tracking-[0.25em] mb-1.5" style={{ color: '#4b5563' }}>MARKET MOOD</div>
                    <p className="text-[11px] leading-relaxed" style={{ color: '#c9b97a' }}>{aiResult.mood}</p>
                  </div>
                )}

                {/* Sectors to invest in */}
                {aiResult.sectors.length > 0 && (
                  <div className="rounded-lg p-3" style={{ background: '#010d1a', border: '1px solid #0c4a6e' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Eye size={9} style={{ color: '#38bdf8' }} />
                      <span className="text-[7px] font-black tracking-[0.25em]" style={{ color: '#38bdf8' }}>SECTORS TO INVEST IN</span>
                    </div>
                    <div className="space-y-2.5">
                      {aiResult.sectors.map((s, i) => (
                        <div key={i} className="border-l-2 pl-2 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ borderColor: i === 0 ? '#0ea5e9' : '#0369a1' }}
                          onClick={() => {
                            const found = sectors.find(sec => sec.name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(sec.shortName.toLowerCase()));
                            if (found) loadSectorStocks(found);
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className="text-[10px] font-black" style={{ color: '#38bdf8' }}>{s.name}</div>
                            {i === 0 && <span className="text-[7px] font-black px-1 py-px rounded" style={{ background: '#0c4a6e', color: '#7dd3fc' }}>TOP PICK</span>}
                          </div>
                          <p className="text-[9px] leading-snug" style={{ color: '#7dd3fc' }}>{s.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top stock */}
                {aiResult.topStock && (
                  <div className="rounded-lg p-3 cursor-pointer hover:brightness-125 transition-all"
                    style={{ background: '#020f02', border: '1px solid #14532d' }}
                    onClick={() => aiResult.topStock && onSelect(aiResult.topStock.ticker)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={9} style={{ color: '#22c55e' }} />
                        <span className="text-[7px] font-black tracking-[0.25em]" style={{ color: '#22c55e' }}>TOP STOCK OPPORTUNITY</span>
                      </div>
                      <span className="text-[7px] font-black px-1.5 py-0.5 rounded"
                        style={{ background: '#052e16', color: '#4ade80', border: '1px solid #166534' }}>ANALYZE →</span>
                    </div>
                    <div className="text-[20px] font-black leading-none mb-1" style={{ color: '#4ade80' }}>{aiResult.topStock.ticker}</div>
                    <p className="text-[9px] leading-snug" style={{ color: '#86efac' }}>{aiResult.topStock.reason}</p>
                  </div>
                )}

                {/* Catalysts */}
                {aiResult.catalysts.length > 0 && (
                  <div className="rounded-lg p-3" style={{ background: '#080600', border: '1px solid #1c1000' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap size={9} style={{ color: '#fbbf24' }} />
                      <span className="text-[7px] font-black tracking-[0.25em]" style={{ color: '#fbbf24' }}>KEY CATALYSTS</span>
                    </div>
                    <div className="space-y-1.5">
                      {aiResult.catalysts.map((c, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-[9px] font-black flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }}>~</span>
                          <span className="text-[9px] leading-snug" style={{ color: '#fcd34d' }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk */}
                {aiResult.risk && (
                  <div className="rounded-lg flex items-start gap-2 p-3"
                    style={{ background: '#080202', border: '1px solid #1f0505' }}>
                    <AlertTriangle size={10} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div className="text-[7px] font-black tracking-[0.2em] mb-1" style={{ color: '#7f1d1d' }}>RISK ALERT</div>
                      <p className="text-[9px] leading-snug" style={{ color: '#6b7280' }}>{aiResult.risk}</p>
                    </div>
                  </div>
                )}

                {/* Headlines */}
                {news.length > 0 && (
                  <div>
                    <div className="text-[7px] font-black tracking-[0.25em] mb-1.5 pt-1" style={{ color: '#1f2937' }}>
                      HEADLINES USED IN ANALYSIS
                    </div>
                    {news.slice(0, 8).map((item, i) => (
                      <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                        className="block py-1.5 px-1 border-b hover:bg-[#080808] rounded transition-colors"
                        style={{ borderColor: '#080808', textDecoration: 'none' }}
                      >
                        <p className="text-[9px] leading-snug" style={{ color: '#4b5563' }}>{item.headline}</p>
                        <span className="text-[7px] font-black" style={{ color: '#1f2937' }}>{item.source?.toUpperCase()}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
