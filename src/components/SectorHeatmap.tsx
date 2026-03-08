'use client';

import { useState, useEffect, useCallback } from 'react';
import { SectorData } from '@/lib/types';
import { RefreshCw, Lock } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

interface Props {
  onSelectTicker: (symbol: string) => void;
}

function getHeatClass(pct: number | null): string {
  if (pct == null) return 'bg-[#111]';
  if (pct >= 2) return 'bg-[#14532d]';
  if (pct >= 1) return 'bg-[#166534]';
  if (pct >= 0.25) return 'bg-[#15803d]';
  if (pct >= -0.25) return 'bg-[#1c1c1c]';
  if (pct >= -1) return 'bg-[#7f1d1d]';
  if (pct >= -2) return 'bg-[#991b1b]';
  return 'bg-[#b91c1c]';
}

function getTextColor(pct: number | null): string {
  if (pct == null) return '#4b5563';
  if (pct >= 0.25) return '#86efac';
  if (pct <= -0.25) return '#fca5a5';
  return '#d1d5db';
}

export default function SectorHeatmap({ onSelectTicker }: Props) {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSectors = useCallback(async () => {
    try {
      const res = await apiFetch('/api/sectors');
      const data = await res.json();
      setSectors(data.sectors || []);
      setLastUpdated(new Date());
    } catch {
      // retain stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
    const interval = setInterval(fetchSectors, 90000);
    return () => clearInterval(interval);
  }, [fetchSectors]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-2 py-1 border-b flex-shrink-0"
        style={{ borderColor: '#1a1a1a' }}
      >
        <span className="text-[9px] font-bold tracking-widest" style={{ color: '#6b7280' }}>
          SECTOR HEATMAP (ETF PROXY)
        </span>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {['#b91c1c', '#991b1b', '#7f1d1d', '#1c1c1c', '#15803d', '#166534', '#14532d'].map((c, i) => (
                <div key={i} className="w-3 h-2 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[8px]" style={{ color: '#374151' }}>-2% … +2%</span>
          </div>
          <button onClick={fetchSectors} className="p-0.5 rounded hover:bg-[#1a1a1a]">
            <RefreshCw size={9} style={{ color: loading ? '#f5a623' : '#4b5563' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-1">
        {loading && sectors.length === 0 ? (
          <div className="flex gap-1 h-full">
            {[...Array(11)].map((_, i) => (
              <div key={i} className="flex-1 rounded shimmer" />
            ))}
          </div>
        ) : sectors.length === 0 ? (
          <div className="flex items-center justify-center h-full gap-2">
            <Lock size={11} style={{ color: '#374151' }} />
            <span className="text-[9px] font-bold" style={{ color: '#374151' }}>SECTOR DATA — PREMIUM PLAN REQUIRED</span>
          </div>
        ) : (
          <div className="flex gap-1 h-full">
            {sectors.map((sector) => {
              const pct = sector.changePercent;
              const textColor = getTextColor(pct);
              return (
                <div
                  key={sector.symbol}
                  onClick={() => onSelectTicker(sector.symbol)}
                  className={`flex-1 flex flex-col items-center justify-center rounded cursor-pointer transition-all hover:ring-1 hover:ring-[#e2c97e]/30 ${getHeatClass(pct)}`}
                  title={`${sector.name}: ${pct != null ? pct.toFixed(2) + '%' : 'N/A'}`}
                >
                  <span
                    className="text-[10px] font-black tracking-wide text-center leading-none"
                    style={{ color: textColor }}
                  >
                    {sector.shortName}
                  </span>
                  <span
                    className="text-[11px] font-bold mt-0.5"
                    style={{ color: textColor }}
                  >
                    {pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
                  </span>
                  {sector.price != null && (
                    <span className="text-[9px] mt-0.5" style={{ color: textColor, opacity: 0.7 }}>
                      ${sector.price.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lastUpdated && (
        <div className="px-2 pb-0.5 text-[8px]" style={{ color: '#1f2937' }}>
          UPD {lastUpdated.toLocaleTimeString('en-US', { hour12: false })}
        </div>
      )}
    </div>
  );
}
