'use client';

import { useState, useEffect } from 'react';
import { X, Key, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { getStoredKeys, saveStoredKeys } from '@/lib/apiClient';

interface Props {
  onClose: () => void;
}

function KeyField({ label, desc, value, onChange, color }: {
  label: string; desc: string; value: string; onChange: (v: string) => void; color: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-bold tracking-widest mb-1" style={{ color: '#6b7280' }}>{label}</label>
      <p className="text-[9px] mb-2" style={{ color: '#374151' }}>{desc}</p>
      <div className="flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
          className="flex-1 px-3 py-2 rounded text-[11px] font-mono outline-none border transition-colors"
          style={{ background: '#1c2128', borderColor: '#30363d', color }}
          onFocus={(e) => (e.target.style.borderColor = color)}
          onBlur={(e) => (e.target.style.borderColor = '#30363d')}
        />
        <button onClick={() => setShow(!show)} className="px-2 rounded border hover:bg-[#21262d] transition-colors" style={{ borderColor: '#30363d' }}>
          {show ? <EyeOff size={12} style={{ color: '#4b5563' }} /> : <Eye size={12} style={{ color: '#4b5563' }} />}
        </button>
      </div>
    </div>
  );
}

export default function SettingsModal({ onClose }: Props) {
  const [fmpKey, setFmpKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [finnhubKey, setFinnhubKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const keys = getStoredKeys();
    setFmpKey(keys.fmpKey);
    setGeminiKey(keys.geminiKey);
    setFinnhubKey(keys.finnhubKey);
  }, []);

  const handleSave = () => {
    saveStoredKeys(fmpKey.trim(), geminiKey.trim(), finnhubKey.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-lg border p-6 overflow-y-auto" style={{ background: '#0a0a0a', borderColor: '#30363d', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Key size={14} style={{ color: '#f5a623' }} />
            <span className="text-[13px] font-black tracking-widest" style={{ color: '#f5a623' }}>API SETTINGS</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#21262d] transition-colors">
            <X size={14} style={{ color: '#6b7280' }} />
          </button>
        </div>

        <KeyField
          label="FINANCIAL MODELING PREP API KEY"
          desc="Market data, fundamentals, dividends, M&A · financialmodelingprep.com"
          value={fmpKey}
          onChange={setFmpKey}
          color="#e2c97e"
        />
        <KeyField
          label="FINNHUB API KEY"
          desc="News, peers, earnings calendar, IPO, filings · finnhub.io"
          value={finnhubKey}
          onChange={setFinnhubKey}
          color="#38bdf8"
        />
        <KeyField
          label="GOOGLE GEMINI API KEY"
          desc="AI analysis powered by Gemini 1.5 Flash · aistudio.google.com"
          value={geminiKey}
          onChange={setGeminiKey}
          color="#a78bfa"
        />

        <div className="rounded p-3 mb-4 text-[9px] leading-relaxed" style={{ background: '#1c2128', border: '1px solid #1a1a1a', color: '#4b5563' }}>
          Keys are stored in your browser&apos;s localStorage and sent securely on each request. Never stored externally.
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded font-bold tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all"
          style={{ background: saved ? '#14532d' : '#1a0f00', border: `1px solid ${saved ? '#22c55e' : '#f5a623'}`, color: saved ? '#22c55e' : '#f5a623' }}
        >
          {saved ? <><CheckCircle size={12} /> SAVED</> : <><Save size={12} /> SAVE KEYS</>}
        </button>
      </div>
    </div>
  );
}
