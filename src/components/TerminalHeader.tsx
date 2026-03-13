'use client';

import { useState, useEffect } from 'react';
import { Activity, Settings } from 'lucide-react';
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
      className="relative flex items-center gap-3 px-4 h-14 flex-shrink-0 border-b"
      style={{
        background: '#161b22',
        borderColor: '#21262d',
        boxShadow: '0 1px 8px rgba(0,0,0,0.4)',
      }}
    >
      {/* Thin amber accent line at very top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #e2c97e30 30%, #f5a62350 50%, #e2c97e30 70%, transparent 100%)' }}
      />

      {/* Logo */}
      <button
        onClick={onHome}
        className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        title="Home"
      >
        <Activity size={18} style={{ color: '#f5a623', filter: 'drop-shadow(0 0 6px rgba(245,166,35,0.6))' }} />
        <div className="text-left">
          <div className="text-[15px] font-black tracking-[0.18em] leading-none gradient-text-amber">
            SAIFBERG
          </div>
          <div className="text-[8px] font-bold tracking-[0.3em]" style={{ color: currentSymbol ? '#6e7681' : '#f5a62370' }}>
            {currentSymbol ? 'TERMINAL' : '● HOME'}
          </div>
        </div>
      </button>

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: '#21262d' }} />

      {/* Search — flex-1 on mobile so it fills available space */}
      <div className="flex-1 lg:flex-none">
        <SearchBar onSelect={onSelect} currentSymbol={currentSymbol} />
      </div>

      {/* Quick tickers */}
      <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
        {POPULAR.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className="px-2 py-1 text-[10px] font-bold rounded transition-all"
            style={{
              color: t === currentSymbol ? '#f5a623' : '#8b949e',
              background: t === currentSymbol ? 'rgba(245,166,35,0.1)' : 'transparent',
              border: `1px solid ${t === currentSymbol ? 'rgba(245,166,35,0.3)' : 'transparent'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: '#21262d' }} />

      {/* Settings */}
      <button
        onClick={() => setShowSettings(true)}
        className="flex-shrink-0 p-1.5 rounded transition-colors"
        style={{ color: '#6e7681' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e6edf3')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6e7681')}
        title="API Settings"
      >
        <Settings size={13} />
      </button>

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: '#21262d' }} />

      {/* Clock */}
      <div className="flex-shrink-0 text-right">
        <div className="text-[13px] sm:text-[15px] font-bold font-mono tracking-widest" style={{ color: '#e6edf3' }}>
          {time}<span className="blink" style={{ color: '#f5a623' }}>_</span>
        </div>
        <div className="hidden sm:block text-[10px] font-mono" style={{ color: '#6e7681' }}>
          {date} EST
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
