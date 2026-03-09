import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

// FMP screener sector names (exact strings)
const VALID_SECTORS = new Set([
  'Technology', 'Financial Services', 'Energy', 'Healthcare',
  'Industrials', 'Consumer Defensive', 'Consumer Cyclical',
  'Real Estate', 'Basic Materials', 'Communication Services', 'Utilities',
]);

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ stocks: [] }, { status: 500 });

  const sector = req.nextUrl.searchParams.get('sector') || '';
  if (!VALID_SECTORS.has(sector)) {
    return NextResponse.json({ stocks: [], error: 'Invalid sector' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BASE}/company-screener?sector=${encodeURIComponent(sector)}&marketCapMoreThan=1000000000&exchange=NYSE,NASDAQ&limit=20&apikey=${apiKey}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.list || []);

    const stocks = list.map((s: {
      symbol: string; companyName: string; marketCap: number;
      price: number; volume: number; beta: number; sector: string; industry: string;
    }) => ({
      symbol:    s.symbol,
      name:      s.companyName,
      marketCap: s.marketCap,
      price:     s.price,
      volume:    s.volume,
      beta:      s.beta,
      industry:  s.industry,
    }));

    return NextResponse.json({ stocks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ stocks: [], error: msg }, { status: 500 });
  }
}
