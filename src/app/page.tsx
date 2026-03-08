'use client';

import { useState } from 'react';
import TerminalHeader from '@/components/TerminalHeader';
import MarketOverview from '@/components/MarketOverview';
import StockDetail from '@/components/StockDetail';
import NewsPanel from '@/components/NewsPanel';
import SectorHeatmap from '@/components/SectorHeatmap';
import HomeBoard from '@/components/HomeBoard';

export default function Terminal() {
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: '#000', overflow: 'hidden' }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <TerminalHeader currentSymbol={activeSymbol ?? ''} onSelect={setActiveSymbol} />

      {/* ── MAIN 3-COLUMN BODY ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* LEFT PANEL — Market Overview */}
        <div
          className="flex-shrink-0 overflow-hidden border-r"
          style={{ width: 220, borderColor: '#1a1a1a' }}
        >
          <MarketOverview onSelectTicker={setActiveSymbol} />
        </div>

        {/* CENTER PANEL — Home Board or Stock Detail */}
        <div
          className="flex-1 overflow-hidden border-r"
          style={{ borderColor: '#1a1a1a', minWidth: 0 }}
        >
          {activeSymbol ? (
            <StockDetail symbol={activeSymbol} />
          ) : (
            <HomeBoard onSelect={setActiveSymbol} />
          )}
        </div>

        {/* RIGHT PANEL — News Feed */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: 300 }}
        >
          <NewsPanel symbol={activeSymbol ?? 'AAPL'} />
        </div>
      </div>

      {/* ── BOTTOM — Sector Heatmap ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t"
        style={{ height: 88, borderColor: '#1a1a1a' }}
      >
        <SectorHeatmap onSelectTicker={setActiveSymbol} />
      </div>
    </div>
  );
}
