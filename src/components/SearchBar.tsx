'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';

interface SearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
}

interface Props {
  onSelect: (symbol: string) => void;
  currentSymbol: string;
}

export default function SearchBar({ onSelect, currentSymbol }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.quotes || []);
      setHighlighted(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query) {
      debounceRef.current = setTimeout(() => search(query), 250);
    } else {
      setResults([]);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && results[highlighted]) { handleSelect(results[highlighted].symbol); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults([]); }
  };

  const typeColor: Record<string, string> = {
    EQUITY: 'text-[#38bdf8]',
    ETF: 'text-[#a78bfa]',
    INDEX: 'text-[#fb923c]',
  };

  return (
    <div className="relative flex-1 max-w-md" style={{ zIndex: 9999 }}>
      <div
        className="flex items-center gap-2 px-3 h-8 border"
        style={{ background: '#1c2128', borderColor: open ? '#e2c97e' : '#30363d' }}
      >
        <Search size={12} style={{ color: '#6b7280' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={`ENTER TICKER — CURRENT: ${currentSymbol}`}
          className="flex-1 bg-transparent text-xs tracking-widest placeholder-[#374151] focus:outline-none"
          style={{ color: '#e2c97e', fontFamily: 'inherit' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} style={{ color: '#6b7280' }}>
            <X size={10} />
          </button>
        )}
      </div>

      {open && (results.length > 0 || loading) && (
        <div
          className="absolute top-full left-0 right-0 border-l border-r border-b overflow-hidden"
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          {loading && (
            <div className="px-3 py-2 text-xs" style={{ color: '#6b7280' }}>
              SEARCHING...
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={r.symbol}
              onMouseDown={() => handleSelect(r.symbol)}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: i === highlighted ? '#21262d' : 'transparent',
                borderBottom: '1px solid #111',
              }}
            >
              <span className="font-bold text-xs w-16" style={{ color: '#e2c97e' }}>{r.symbol}</span>
              <span className="flex-1 text-xs truncate" style={{ color: '#9ca3af' }}>
                {r.shortname || r.longname || ''}
              </span>
              <span className={`text-xs ${typeColor[r.quoteType || ''] || 'text-[#4b5563]'}`}>
                {r.quoteType}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
