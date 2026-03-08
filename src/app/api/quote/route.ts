import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/lib/fmp';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  const apiKey = req.headers.get('x-fmp-key') || undefined;

  try {
    const quote = await getQuote(symbol.toUpperCase(), apiKey);
    if (!quote) return NextResponse.json({ error: `${symbol} not found` }, { status: 404 });
    return NextResponse.json({
      symbol: quote.symbol,
      shortName: quote.name,
      longName: quote.name,
      regularMarketPrice: quote.price,
      regularMarketChange: quote.change,
      regularMarketChangePercent: quote.changesPercentage,
      regularMarketOpen: quote.open,
      regularMarketDayHigh: quote.dayHigh,
      regularMarketDayLow: quote.dayLow,
      regularMarketVolume: quote.volume,
      averageDailyVolume3Month: quote.avgVolume,
      marketCap: quote.marketCap,
      fiftyTwoWeekLow: quote.yearLow,
      fiftyTwoWeekHigh: quote.yearHigh,
      trailingPE: quote.pe || null,
      trailingEps: quote.eps || null,
      exchange: quote.exchange,
      previousClose: quote.previousClose,
      sharesOutstanding: quote.sharesOutstanding,
      marketState: 'REGULAR',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch quote';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
