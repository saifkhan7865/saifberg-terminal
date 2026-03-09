'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Settings } from 'lucide-react';
import SearchBar from './SearchBar';
import SettingsModal from './SettingsModal';

interface Props {
  currentSymbol: string;
  onSelect: (symbol: string) => void;
  onHome?: () => void;
}

const POPULAR = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'SPY', 'QQQ', 'BTC-USD'];

export default function TerminalHeader({ currentSymbol, onSelect, onHome }: Props) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-3 px-3 h-12 flex-shrink-0 border-b"
      style={{
        background: '#030303',
        borderColor: '#1a1a1a',
        boxShadow: '0 1px 0 #0d0d0d',
      }}
    >
      {/* Logo — click to go home */}
      <button
        onClick={onHome}
        className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        title="Home"
      >
        <BarChart2 size={16} style={{ color: '#f5a623' }} />
        <div className="text-left">
          <div
            className="text-[13px] font-black tracking-[0.2em] leading-none"
            style={{ color: '#f5a623', textShadow: '0 0 12px rgba(245,166,35,0.4)' }}
          >
            SAIFBERG
          </div>
          <div className="text-[7px] font-bold tracking-[0.3em]" style={{ color: currentSymbol ? '#4b5563' : '#f5a623' }}>
            {currentSymbol ? 'TERMINAL' : '● HOME'}
          </div>
        </div>
      </button>

      {/* Divider */}
      <div className="w-px h-6 flex-shrink-0" style={{ background: '#1a1a1a' }} />

      {/* Search */}
      <SearchBar onSelect={onSelect} currentSymbol={currentSymbol} />

      {/* Quick tickers */}
      <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
        {POPULAR.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className="px-1.5 py-0.5 text-[9px] font-bold rounded transition-all hover:bg-[#1a1a1a]"
            style={{
              color: t === currentSymbol ? '#f5a623' : '#374151',
              border: `1px solid ${t === currentSymbol ? '#2a2a2a' : 'transparent'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 flex-shrink-0 ml-auto" style={{ background: '#1a1a1a' }} />

      {/* Settings */}
      <button
        onClick={() => setShowSettings(true)}
        className="flex-shrink-0 p-1.5 rounded hover:bg-[#1a1a1a] transition-colors"
        title="API Settings"
      >
        <Settings size={13} style={{ color: '#4b5563' }} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 flex-shrink-0" style={{ background: '#1a1a1a' }} />

      {/* Clock */}
      <div className="flex-shrink-0 text-right">
        <div className="text-[13px] font-bold font-mono tracking-widest" style={{ color: '#e2c97e' }}>
          {time}<span className="blink">_</span>
        </div>
        <div className="text-[9px] font-mono" style={{ color: '#4b5563' }}>
          {date} EST
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
