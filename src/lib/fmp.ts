/**
 * Financial Modeling Prep (FMP) API client
 * Uses the /stable/ API (required for accounts created after Aug 31 2025)
 */

const BASE = 'https://financialmodelingprep.com/stable';

function key(override?: string) {
  const k = override || process.env.FMP_API_KEY;
  if (!k) throw new Error('FMP_API_KEY not configured. Add your key in Settings ⚙');
  return k;
}

async function fmpFetch<T>(path: string, apiKey?: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}apikey=${key(apiKey)}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`FMP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data && typeof data === 'object' && 'Error Message' in data) {
    throw new Error(String(data['Error Message']));
  }
  return data as T;
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  sharesOutstanding: number;
  timestamp: number;
  earningsAnnouncement: string;
}

export async function getQuote(symbol: string, apiKey?: string): Promise<FMPQuote | null> {
  const data = await fmpFetch<FMPQuote[]>(`/quote?symbol=${encodeURIComponent(symbol)}`, apiKey);
  return data?.[0] ?? null;
}

export async function getQuotes(symbols: string[], apiKey?: string): Promise<FMPQuote[]> {
  if (!symbols.length) return [];
  const data = await fmpFetch<FMPQuote[]>(`/quote?symbol=${symbols.map(encodeURIComponent).join(',')}`, apiKey);
  return data ?? [];
}

// ─── Profile (company info) ───────────────────────────────────────────────────

export interface FMPProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  companyName: string;
  currency: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  sector: string;
  country: string;
  description: string;
  ceo: string;
  website: string;
  fullTimeEmployees: string;
  ipoDate: string;
  isEtf: boolean;
  isFund: boolean;
}

export async function getProfile(symbol: string, apiKey?: string): Promise<FMPProfile | null> {
  const data = await fmpFetch<FMPProfile[]>(`/profile?symbol=${encodeURIComponent(symbol)}`, apiKey);
  return data?.[0] ?? null;
}

// ─── Key Metrics ──────────────────────────────────────────────────────────────

export interface FMPKeyMetrics {
  symbol: string;
  date: string;
  peRatio: number;
  pbRatio: number;
  priceToSalesRatio: number;
  pfcfRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  debtToEquity: number;
  currentRatio: number;
  dividendYield: number;
  earningsYield: number;
  freeCashFlowYield: number;
  revenuePerShare: number;
  netIncomePerShare: number;
  freeCashFlowPerShare: number;
  bookValuePerShare: number;
  roe: number;
  roic: number;
  marketCap: number;
  grahamNumber: number;
}

export async function getKeyMetrics(symbol: string, apiKey?: string): Promise<FMPKeyMetrics | null> {
  const data = await fmpFetch<FMPKeyMetrics[]>(`/key-metrics?symbol=${encodeURIComponent(symbol)}&period=annual&limit=1`, apiKey);
  return data?.[0] ?? null;
}

// ─── Income Statement ─────────────────────────────────────────────────────────

export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  netIncome: number;
  netIncomeRatio: number;
  ebitda: number;
  ebitdaratio: number;
  eps: number;
  epsdiluted: number;
  researchAndDevelopmentExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  depreciationAndAmortization: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export async function getIncomeStatement(symbol: string, apiKey?: string): Promise<FMPIncomeStatement | null> {
  const data = await fmpFetch<FMPIncomeStatement[]>(`/income-statement?symbol=${encodeURIComponent(symbol)}&period=annual&limit=2`, apiKey);
  return data?.[0] ?? null;
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export interface FMPBalanceSheet {
  date: string;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  totalCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  totalDebt: number;
  netDebt: number;
  longTermDebt: number;
  shortTermDebt: number;
}

export async function getBalanceSheet(symbol: string, apiKey?: string): Promise<FMPBalanceSheet | null> {
  const data = await fmpFetch<FMPBalanceSheet[]>(`/balance-sheet-statement?symbol=${encodeURIComponent(symbol)}&period=annual&limit=1`, apiKey);
  return data?.[0] ?? null;
}

// ─── Cash Flow ────────────────────────────────────────────────────────────────

export interface FMPCashFlow {
  date: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  netIncome: number;
  commonStockRepurchased: number;
  dividendsPaid: number;
}

export async function getCashFlow(symbol: string, apiKey?: string): Promise<FMPCashFlow | null> {
  const data = await fmpFetch<FMPCashFlow[]>(`/cash-flow-statement?symbol=${encodeURIComponent(symbol)}&period=annual&limit=1`, apiKey);
  return data?.[0] ?? null;
}

// ─── Financial Ratios ─────────────────────────────────────────────────────────

export interface FMPRatios {
  date: string;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  netProfitMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  debtEquityRatio: number;
  currentRatio: number;
  quickRatio: number;
  priceEarningsRatio: number;
  priceToBookRatio: number;
  dividendYield: number;
  payoutRatio: number;
  revenueGrowth?: number;
}

export async function getRatios(symbol: string, apiKey?: string): Promise<FMPRatios | null> {
  const data = await fmpFetch<FMPRatios[]>(`/ratios?symbol=${encodeURIComponent(symbol)}&period=annual&limit=1`, apiKey);
  return data?.[0] ?? null;
}

// ─── Revenue Growth ──────────────────────────────────────────────────────────

export async function getRevenueGrowth(symbol: string, apiKey?: string): Promise<number | null> {
  try {
    const data = await fmpFetch<{ date: string; revenue: number }[]>(
      `/income-statement?symbol=${encodeURIComponent(symbol)}&period=annual&limit=2`,
      apiKey
    );
    if (data?.length >= 2 && data[1].revenue > 0) {
      return (data[0].revenue - data[1].revenue) / data[1].revenue;
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Analyst Price Targets ────────────────────────────────────────────────────

export interface FMPPriceTarget {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetConsensus: number;
  targetMedian: number;
}

export async function getPriceTarget(symbol: string, apiKey?: string): Promise<FMPPriceTarget | null> {
  try {
    const data = await fmpFetch<FMPPriceTarget>(`/price-target-consensus?symbol=${encodeURIComponent(symbol)}`, apiKey);
    return data ?? null;
  } catch { return null; }
}

// ─── Analyst Rating ──────────────────────────────────────────────────────────

export interface FMPRating {
  symbol: string;
  date: string;
  rating: string;
  ratingScore: number;
  ratingRecommendation: string;
}

export async function getRating(symbol: string, apiKey?: string): Promise<FMPRating | null> {
  try {
    const data = await fmpFetch<FMPRating[]>(`/rating?symbol=${encodeURIComponent(symbol)}`, apiKey);
    return data?.[0] ?? null;
  } catch { return null; }
}

// ─── News ─────────────────────────────────────────────────────────────────────

export interface FMPNews {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

export async function getNews(symbol: string, limit = 15, apiKey?: string): Promise<FMPNews[]> {
  const data = await fmpFetch<FMPNews[]>(`/stock-news?symbol=${encodeURIComponent(symbol)}&limit=${limit}`, apiKey);
  return data ?? [];
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface FMPSearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

export async function searchSymbols(query: string, limit = 8, apiKey?: string): Promise<FMPSearchResult[]> {
  const data = await fmpFetch<FMPSearchResult[]>(`/search-name?query=${encodeURIComponent(query)}&limit=${limit}`, apiKey);
  return data ?? [];
}

// ─── Market Movers ────────────────────────────────────────────────────────────

export interface FMPMover {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

export async function getGainers(apiKey?: string): Promise<FMPMover[]> {
  const data = await fmpFetch<FMPMover[]>('/gainers', apiKey);
  return (data ?? []).slice(0, 8);
}

export async function getLosers(apiKey?: string): Promise<FMPMover[]> {
  const data = await fmpFetch<FMPMover[]>('/losers', apiKey);
  return (data ?? []).slice(0, 8);
}

export async function getMostActive(apiKey?: string): Promise<FMPMover[]> {
  const data = await fmpFetch<FMPMover[]>('/actives', apiKey);
  return (data ?? []).slice(0, 8);
}

// ─── Sector Performance ──────────────────────────────────────────────────────

export interface FMPSectorPerformance {
  sector: string;
  changesPercentage: string; // e.g. "+1.23%"
}

export async function getSectorPerformance(apiKey?: string): Promise<FMPSectorPerformance[]> {
  const data = await fmpFetch<FMPSectorPerformance[]>('/sector-performance', apiKey);
  return data ?? [];
}

// ─── Historical Prices (chart) ────────────────────────────────────────────────

export interface FMPHistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getHistorical(symbol: string, from: string, to: string, apiKey?: string): Promise<FMPHistoricalBar[]> {
  const data = await fmpFetch<FMPHistoricalBar[]>(
    `/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`,
    apiKey
  );
  return data ?? [];
}
