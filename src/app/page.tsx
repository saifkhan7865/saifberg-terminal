'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TerminalHeader from '@/components/TerminalHeader';
import StockSidebar from '@/components/StockSidebar';
import StockDetail from '@/components/StockDetail';
import NewsPanel from '@/components/NewsPanel';
import PeersBar from '@/components/PeersBar';
import HomeBoard from '@/components/HomeBoard';

function TerminalApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSymbol, setActiveSymbol] = useState<string | null>(
    searchParams.get('symbol') || null
  );

  // Keep state in sync when user navigates back/forward
  useEffect(() => {
    const sym = searchParams.get('symbol') || null;
    setActiveSymbol(sym);
  }, [searchParams]);

  const handleSelect = (symbol: string | null) => {
    setActiveSymbol(symbol);
    if (symbol) {
      router.push(`?symbol=${encodeURIComponent(symbol)}`, { scroll: false });
    } else {
      router.push('/', { scroll: false });
    }
  };

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
        /* ── STOCK VIEW: everything about the stock ─────────────────── */
        <>
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* LEFT: Stock quick stats + analyst + peers list */}
            <div className="flex-shrink-0 overflow-hidden border-r" style={{ width: 220, borderColor: '#21262d' }}>
              <StockSidebar symbol={activeSymbol} onSelectTicker={handleSelect} />
            </div>

            {/* CENTER: Stock detail (GP/FA/AI/CN/PEERS/FILINGS/ERN/DVD/IPO) */}
            <div className="flex-1 overflow-hidden border-r" style={{ borderColor: '#21262d', minWidth: 0 }}>
              <StockDetail symbol={activeSymbol} />
            </div>

            {/* RIGHT: Company news */}
            <div className="flex-shrink-0 overflow-hidden" style={{ width: 300 }}>
              <NewsPanel symbol={activeSymbol} />
            </div>
          </div>

          {/* BOTTOM: Peer comparison bar */}
          <div className="flex-shrink-0 border-t" style={{ height: 88, borderColor: '#21262d' }}>
            <PeersBar symbol={activeSymbol} onSelectTicker={handleSelect} />
          </div>
        </>
      ) : (
        /* ── HOME DASHBOARD: full width market overview ──────────────── */
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
