export interface QuoteData {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  bid?: number;
  ask?: number;
  currency?: string;
  quoteType?: string;
  marketState?: string;
  exchange?: string;
  trailingPE?: number;
  forwardPE?: number;
}

export interface FundamentalsData {
  symbol: string;
  shortName?: string;
  longName?: string;
  sector?: string;
  industry?: string;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  pegRatio?: number;
  enterpriseToEbitda?: number;
  enterpriseToRevenue?: number;
  trailingEps?: number;
  forwardEps?: number;
  bookValue?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  totalDebt?: number;
  totalCash?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  totalRevenue?: number;
  revenuePerShare?: number;
  dividendYield?: number;
  dividendRate?: number;
  payoutRatio?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
  recommendationMean?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
  analystBuy?: number;
  analystHold?: number;
  analystSell?: number;
  sharesShort?: number;
  shortRatio?: number;
  shortPercentOfFloat?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  beta?: number;
  marketCap?: number;
  currentPrice?: number;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime?: number;
  type?: string;
  thumbnail?: { resolutions?: { url: string; width: number }[] };
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface Mover {
  symbol: string;
  shortName: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
}

export interface SectorData {
  symbol: string;
  name: string;
  shortName: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  ytdChange: number | null;
}

export interface ChartQuote {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface SignalResult {
  signal: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  score: number;
  scoreMax: number;
  reasons: { text: string; positive: boolean }[];
}
