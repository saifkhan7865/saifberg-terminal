'use client';

import { useState } from 'react';
import TerminalHeader from '@/components/TerminalHeader';
import StockSidebar from '@/components/StockSidebar';
import StockDetail from '@/components/StockDetail';
import NewsPanel from '@/components/NewsPanel';
import PeersBar from '@/components/PeersBar';
import HomeBoard from '@/components/HomeBoard';

export default function Terminal() {
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: '#000', overflow: 'hidden' }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <TerminalHeader currentSymbol={activeSymbol ?? ''} onSelect={setActiveSymbol} onHome={() => setActiveSymbol(null)} />

      {activeSymbol ? (
        /* ── STOCK VIEW: everything about the stock ─────────────────── */
        <>
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* LEFT: Stock quick stats + analyst + peers list */}
            <div className="flex-shrink-0 overflow-hidden border-r" style={{ width: 220, borderColor: '#1a1a1a' }}>
              <StockSidebar symbol={activeSymbol} onSelectTicker={setActiveSymbol} />
            </div>

            {/* CENTER: Stock detail (GP/FA/AI/CN/PEERS/FILINGS/ERN/DVD/IPO) */}
            <div className="flex-1 overflow-hidden border-r" style={{ borderColor: '#1a1a1a', minWidth: 0 }}>
              <StockDetail symbol={activeSymbol} />
            </div>

            {/* RIGHT: Company news */}
            <div className="flex-shrink-0 overflow-hidden" style={{ width: 300 }}>
              <NewsPanel symbol={activeSymbol} />
            </div>
          </div>

          {/* BOTTOM: Peer comparison bar */}
          <div className="flex-shrink-0 border-t" style={{ height: 88, borderColor: '#1a1a1a' }}>
            <PeersBar symbol={activeSymbol} onSelectTicker={setActiveSymbol} />
          </div>
        </>
      ) : (
        /* ── HOME DASHBOARD: full width market overview ──────────────── */
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <HomeBoard onSelect={setActiveSymbol} />
        </div>
      )}
    </div>
  );
}
