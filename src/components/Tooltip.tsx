'use client';
import { useState } from 'react';

interface Props { text: string; children: React.ReactNode }

export default function Tooltip({ text, children }: Props) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none"
          style={{ width: 180 }}>
          <span className="block px-2 py-1.5 rounded text-[9px] leading-snug"
            style={{ background: '#111', color: '#e2c97e', border: '1px solid #1f1f1f' }}>
            {text}
          </span>
          <span className="block w-2 h-2 mx-auto -mt-1 rotate-45"
            style={{ background: '#111', borderRight: '1px solid #1f1f1f', borderBottom: '1px solid #1f1f1f' }} />
        </span>
      )}
    </span>
  );
}
