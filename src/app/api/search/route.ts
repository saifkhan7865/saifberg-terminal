import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

// Major exchanges get priority in results
const PRIORITY_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'AMEX', 'NYSE ARCA']);

interface FMPResult { symbol: string; name: string; currency: string; exchangeFullName: string; exchange: string; }

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ quotes: [] });

  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ quotes: [] }, { status: 500 });

  try {
    // Run symbol search + name search in parallel
    const [symRes, nameRes] = await Promise.allSettled([
      fetch(`${BASE}/search-symbol?query=${encodeURIComponent(query)}&limit=15&apikey=${apiKey}`).then(r => r.json()),
      fetch(`${BASE}/search-name?query=${encodeURIComponent(query)}&limit=10&apikey=${apiKey}`).then(r => r.json()),
    ]);

    const symResults: FMPResult[] = symRes.status === 'fulfilled' && Array.isArray(symRes.value) ? symRes.value : [];
    const nameResults: FMPResult[] = nameRes.status === 'fulfilled' && Array.isArray(nameRes.value) ? nameRes.value : [];

    // Merge, deduplicate by symbol — symbol matches first
    const seen = new Set<string>();
    const merged: FMPResult[] = [];
    for (const r of [...symResults, ...nameResults]) {
      if (!seen.has(r.symbol)) {
        seen.add(r.symbol);
        merged.push(r);
      }
    }

    // Sort: priority exchanges first
    merged.sort((a, b) => {
      const aP = PRIORITY_EXCHANGES.has(a.exchange) ? 0 : 1;
      const bP = PRIORITY_EXCHANGES.has(b.exchange) ? 0 : 1;
      return aP - bP;
    });

    const quotes = merged.slice(0, 8).map(r => ({
      symbol: r.symbol,
      shortname: r.name,
      quoteType: r.exchange === 'CCC' ? 'CRYPTO' : 'EQUITY',
      exchange: r.exchange,
    }));

    return NextResponse.json({ quotes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: msg, quotes: [] }, { status: 500 });
  }
}
