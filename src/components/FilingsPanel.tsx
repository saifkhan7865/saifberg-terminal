'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { FileText, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Filing {
  form: string;
  filedDate: string;
  acceptedDate: string;
  reportDate: string;
  url: string;
  accessNumber: string;
}

const FORM_COLORS: Record<string, string> = {
  '10-K': '#f5a623', '10-Q': '#e2c97e', '8-K': '#38bdf8',
  'DEF 14A': '#a78bfa', 'S-1': '#f472b6', '4': '#34d399',
  '13F': '#fb923c',
};

function formColor(form: string) {
  return FORM_COLORS[form] || '#6b7280';
}

const FORM_DESCS: Record<string, string> = {
  '10-K': 'Annual Report', '10-Q': 'Quarterly Report', '8-K': 'Current Report',
  'DEF 14A': 'Proxy Statement', 'S-1': 'Registration Statement',
  '4': 'Insider Transaction', '13F': 'Institutional Holdings',
};

export default function FilingsPanel({ symbol }: { symbol: string }) {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFilings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/finnhub/filings?symbol=${symbol}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setFilings(data.filings || []);
    } catch { setError('Failed to load filings'); }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { fetchFilings(); }, [fetchFilings]);

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'MMM dd, yyyy'); } catch { return d; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#21262d' }}>
        <div className="flex items-center gap-2">
          <FileText size={11} style={{ color: '#fb923c' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: '#fb923c' }}>FILINGS · {symbol} SEC DOCUMENTS</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded shimmer" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 p-4">
            <span className="text-[10px] font-bold text-center" style={{ color: '#ef4444' }}>{error}</span>
            {error.includes('configured') && (
              <span className="text-[9px] text-center" style={{ color: '#374151' }}>Add your Finnhub key in Settings ⚙</span>
            )}
          </div>
        ) : filings.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px]" style={{ color: '#374151' }}>NO FILINGS FOUND</span>
          </div>
        ) : (
          filings.map((filing, i) => (
            <a
              key={i}
              href={filing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 border-b hover:bg-[#1c2128] transition-colors group"
              style={{ borderColor: '#1c2128', textDecoration: 'none' }}
            >
              <div
                className="flex-shrink-0 w-12 text-center py-0.5 rounded text-[9px] font-black"
                style={{ background: `${formColor(filing.form)}18`, border: `1px solid ${formColor(filing.form)}40`, color: formColor(filing.form) }}
              >
                {filing.form}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold truncate" style={{ color: '#c9b97a' }}>
                  {FORM_DESCS[filing.form] || filing.form}
                </div>
                <div className="text-[9px]" style={{ color: '#4b5563' }}>
                  Filed: {fmtDate(filing.filedDate)}
                  {filing.reportDate && ` · Period: ${fmtDate(filing.reportDate)}`}
                </div>
              </div>
              <ExternalLink size={10} style={{ color: '#374151', flexShrink: 0 }} className="group-hover:text-[#38bdf8] transition-colors" />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
