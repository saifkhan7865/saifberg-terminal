import { NextRequest, NextResponse } from 'next/server';
import { getFilings } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol required', filings: [] }, { status: 400 });

  const apiKey = req.headers.get('x-finnhub-key') || undefined;

  try {
    const filings = await getFilings(symbol.toUpperCase(), apiKey);
    return NextResponse.json({ filings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch filings';
    return NextResponse.json({ error: msg, filings: [] }, { status: 500 });
  }
}
