'use client';

const FMP_KEY_STORAGE = 'saif_fmp_api_key';
const GEMINI_KEY_STORAGE = 'saif_gemini_api_key';
const FINNHUB_KEY_STORAGE = 'saif_finnhub_api_key';

export function getStoredKeys() {
  if (typeof window === 'undefined') return { fmpKey: '', geminiKey: '', finnhubKey: '' };
  return {
    fmpKey: localStorage.getItem(FMP_KEY_STORAGE) || '',
    geminiKey: localStorage.getItem(GEMINI_KEY_STORAGE) || '',
    finnhubKey: localStorage.getItem(FINNHUB_KEY_STORAGE) || '',
  };
}

export function saveStoredKeys(fmpKey: string, geminiKey: string, finnhubKey: string) {
  localStorage.setItem(FMP_KEY_STORAGE, fmpKey);
  localStorage.setItem(GEMINI_KEY_STORAGE, geminiKey);
  localStorage.setItem(FINNHUB_KEY_STORAGE, finnhubKey);
}

export function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const { fmpKey, geminiKey, finnhubKey } = getStoredKeys();
  const headers = new Headers(options?.headers);
  if (fmpKey) headers.set('x-fmp-key', fmpKey);
  if (geminiKey) headers.set('x-gemini-key', geminiKey);
  if (finnhubKey) headers.set('x-finnhub-key', finnhubKey);
  return fetch(url, { ...options, headers });
}
