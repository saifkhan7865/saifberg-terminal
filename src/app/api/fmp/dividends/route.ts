import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol required', dividends: [] }, { status: 400 });

  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'FMP API key not configured', dividends: [] }, { status: 500 });

  try {
    const res = await fetch(
      `${BASE}/dividends?symbol=${encodeURIComponent(symbol.toUpperCase())}&apikey=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    if (data?.['Error Message']) throw new Error(data['Error Message']);
    const dividends = Array.isArray(data) ? data.slice(0, 50) : [];
    return NextResponse.json({ dividends });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch dividends';
    return NextResponse.json({ error: msg, dividends: [] }, { status: 500 });
  }
}
