/**
 * Finnhub API client — free tier: 60 calls/minute
 * https://finnhub.io/docs/api
 */

const BASE = 'https://finnhub.io/api/v1';

function key(override?: string) {
  const k = override || process.env.FINNHUB_API_KEY;
  if (!k) throw new Error('FINNHUB_API_KEY not configured. Add your key in Settings ⚙');
  return k;
}

async function fhFetch<T>(path: string, apiKey?: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}token=${key(apiKey)}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 120 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Finnhub ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Market News ──────────────────────────────────────────────────────────────

export interface FHNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export async function getMarketNews(category = 'general', apiKey?: string): Promise<FHNewsItem[]> {
  const data = await fhFetch<FHNewsItem[]>(`/news?category=${category}`, apiKey);
  return (data ?? []).slice(0, 30);
}

export async function getCompanyNews(symbol: string, from: string, to: string, apiKey?: string): Promise<FHNewsItem[]> {
  const data = await fhFetch<FHNewsItem[]>(`/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`, apiKey);
  return (data ?? []).slice(0, 25);
}

// ─── Company Peers ────────────────────────────────────────────────────────────

export async function getCompanyPeers(symbol: string, apiKey?: string): Promise<string[]> {
  const data = await fhFetch<string[]>(`/stock/peers?symbol=${encodeURIComponent(symbol)}`, apiKey);
  return data ?? [];
}

// ─── Earnings Calendar ────────────────────────────────────────────────────────

export interface FHEarning {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

export interface FHEarningsCalendar {
  earningsCalendar: FHEarning[];
}

export async function getEarningsCalendar(from: string, to: string, apiKey?: string): Promise<FHEarning[]> {
  const data = await fhFetch<FHEarningsCalendar>(`/calendar/earnings?from=${from}&to=${to}`, apiKey);
  return data?.earningsCalendar ?? [];
}

// ─── IPO Calendar ─────────────────────────────────────────────────────────────

export interface FHIpo {
  date: string;
  exchange: string;
  name: string;
  numberOfShares: number;
  price: string;
  status: string;
  symbol: string;
  totalSharesValue: number;
}

export interface FHIpoCalendar {
  ipoCalendar: FHIpo[];
}

export async function getIPOCalendar(from: string, to: string, apiKey?: string): Promise<FHIpo[]> {
  const data = await fhFetch<FHIpoCalendar>(`/calendar/ipo?from=${from}&to=${to}`, apiKey);
  return data?.ipoCalendar ?? [];
}

// ─── SEC Filings ──────────────────────────────────────────────────────────────

export interface FHFiling {
  accessNumber: string;
  symbol: string;
  cik: string;
  form: string;
  filedDate: string;
  acceptedDate: string;
  reportDate: string;
  url: string;
}

export interface FHFilingsResponse {
  data: FHFiling[];
}

export async function getFilings(symbol: string, apiKey?: string): Promise<FHFiling[]> {
  const data = await fhFetch<FHFilingsResponse>(`/stock/filings?symbol=${encodeURIComponent(symbol)}`, apiKey);
  return (data?.data ?? []).slice(0, 20);
}
