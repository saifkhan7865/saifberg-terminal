'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BarChart2, Brain, Newspaper, Users, LayoutDashboard } from 'lucide-react';
import TerminalHeader from '@/components/TerminalHeader';
import StockSidebar from '@/components/StockSidebar';
import StockDetail from '@/components/StockDetail';
import NewsPanel from '@/components/NewsPanel';
import PeersBar from '@/components/PeersBar';
import HomeBoard from '@/components/HomeBoard';

type MobilePanelView = 'detail' | 'sidebar' | 'news' | 'peers';

interface MobileNavTab {
  id: MobilePanelView;
  label: string;
  color: string;
  icon: React.ReactNode;
  cmd?: string;
}

function TerminalApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSymbol, setActiveSymbol] = useState<string | null>(
    searchParams.get('symbol') || null
  );
  const [mobilePanelView, setMobilePanelView] = useState<MobilePanelView>('detail');
  const [mobileDetailCmd, setMobileDetailCmd] = useState<string>('GP');

  // Keep state in sync when user navigates back/forward
  useEffect(() => {
    const sym = searchParams.get('symbol') || null;
    setActiveSymbol(sym);
  }, [searchParams]);

  // Reset mobile panel state when symbol changes
  useEffect(() => {
    setMobilePanelView('detail');
    setMobileDetailCmd('GP');
  }, [activeSymbol]);

  const handleSelect = (symbol: string | null) => {
    setActiveSymbol(symbol);
    if (symbol) {
      router.push(`?symbol=${encodeURIComponent(symbol)}`, { scroll: false });
    } else {
      router.push('/', { scroll: false });
    }
  };

  const MOBILE_TABS: MobileNavTab[] = [
    {
      id: 'sidebar',
      label: 'Stats',
      color: '#f5a623',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'detail',
      label: 'Chart',
      color: '#e2c97e',
      icon: <BarChart2 size={18} />,
      cmd: 'GP',
    },
    {
      id: 'detail',
      label: 'AI',
      color: '#a78bfa',
      icon: <Brain size={18} />,
      cmd: 'AI',
    },
    {
      id: 'news',
      label: 'News',
      color: '#38bdf8',
      icon: <Newspaper size={18} />,
    },
    {
      id: 'peers',
      label: 'Peers',
      color: '#4ade80',
      icon: <Users size={18} />,
    },
  ];

  // Determine which bottom nav tab is "active" for highlight purposes
  const activeMobileTabIndex = (() => {
    if (mobilePanelView === 'sidebar') return 0;
    if (mobilePanelView === 'detail' && mobileDetailCmd === 'GP') return 1;
    if (mobilePanelView === 'detail' && mobileDetailCmd === 'AI') return 2;
    if (mobilePanelView === 'news') return 3;
    if (mobilePanelView === 'peers') return 4;
    return 1;
  })();

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: '#0d1117', overflow: 'hidden' }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <TerminalHeader
        currentSymbol={activeSymbol ?? ''}
        onSelect={handleSelect}
        onHome={() => handleSelect(null)}
      />

      {activeSymbol ? (
        <>
          {/* ── DESKTOP STOCK VIEW (lg+) ──────────────────────────── */}
          <div className="hidden lg:flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* LEFT: Stock quick stats + analyst + peers list */}
            <div className="flex-shrink-0 overflow-hidden border-r" style={{ width: 220, borderColor: '#21262d' }}>
              <StockSidebar symbol={activeSymbol} onSelectTicker={handleSelect} />
            </div>

            {/* CENTER: Stock detail */}
            <div className="flex-1 overflow-hidden border-r" style={{ borderColor: '#21262d', minWidth: 0 }}>
              <StockDetail symbol={activeSymbol} />
            </div>

            {/* RIGHT: Company news */}
            <div className="flex-shrink-0 overflow-hidden" style={{ width: 300 }}>
              <NewsPanel symbol={activeSymbol} />
            </div>
          </div>

          {/* DESKTOP BOTTOM: Peer comparison bar */}
          <div className="hidden lg:block flex-shrink-0 border-t" style={{ height: 88, borderColor: '#21262d' }}>
            <PeersBar symbol={activeSymbol} onSelectTicker={handleSelect} />
          </div>

          {/* ── MOBILE STOCK VIEW (< lg) ──────────────────────────── */}
          <div className="flex lg:hidden flex-1 overflow-hidden" style={{ minHeight: 0, paddingBottom: 56 }}>
            {mobilePanelView === 'sidebar' && (
              <div className="flex flex-col h-full w-full overflow-hidden">
                <StockSidebar symbol={activeSymbol} onSelectTicker={(sym) => { handleSelect(sym); setMobilePanelView('detail'); setMobileDetailCmd('GP'); }} />
              </div>
            )}
            {mobilePanelView === 'detail' && (
              <div className="flex flex-col h-full w-full overflow-hidden">
                <StockDetail symbol={activeSymbol} mobileCmd={mobileDetailCmd} />
              </div>
            )}
            {mobilePanelView === 'news' && (
              <div className="flex flex-col h-full w-full overflow-hidden">
                <NewsPanel symbol={activeSymbol} />
              </div>
            )}
            {mobilePanelView === 'peers' && (
              <div className="flex flex-col h-full w-full overflow-hidden">
                <PeersBar symbol={activeSymbol} onSelectTicker={(sym) => { handleSelect(sym); setMobilePanelView('detail'); setMobileDetailCmd('GP'); }} />
              </div>
            )}
          </div>

          {/* ── MOBILE BOTTOM NAV ──────────────────────────────────── */}
          <div
            className="flex lg:hidden flex-shrink-0"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 56,
              background: '#161b22',
              borderTop: '1px solid #21262d',
              zIndex: 50,
            }}
          >
            {MOBILE_TABS.map((tab, i) => {
              const isActive = activeMobileTabIndex === i;
              return (
                <button
                  key={`${tab.id}-${tab.label}`}
                  onClick={() => {
                    setMobilePanelView(tab.id);
                    if (tab.cmd) setMobileDetailCmd(tab.cmd);
                  }}
                  className="flex-1 flex flex-col items-center justify-center gap-1 relative"
                  style={{ color: isActive ? tab.color : '#484f58' }}
                >
                  {/* Active top underline */}
                  {isActive && (
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2"
                      style={{
                        height: 2,
                        width: '60%',
                        borderRadius: '0 0 2px 2px',
                        background: tab.color,
                      }}
                    />
                  )}
                  <span style={{ color: isActive ? tab.color : '#484f58' }}>{tab.icon}</span>
                  <span
                    className="font-bold tracking-wide"
                    style={{ fontSize: 9, color: isActive ? tab.color : '#484f58' }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* ── HOME DASHBOARD ──────────────────────────────────────── */
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <HomeBoard onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ background: '#000', height: '100dvh' }} />}>
      <TerminalApp />
    </Suspense>
  );
}
