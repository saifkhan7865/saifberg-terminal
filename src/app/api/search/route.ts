import { NextRequest, NextResponse } from 'next/server';
import { searchSymbols } from '@/lib/fmp';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ quotes: [] });

  const apiKey = req.headers.get('x-fmp-key') || undefined;

  try {
    const results = await searchSymbols(query, 8, apiKey);
    const quotes = results.map(r => ({
      symbol: r.symbol,
      shortname: r.name,
      quoteType: 'EQUITY',
      exchange: r.exchangeShortName,
    }));
    return NextResponse.json({ quotes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: msg, quotes: [] }, { status: 500 });
  }
}
