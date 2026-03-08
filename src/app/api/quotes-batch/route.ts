import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) return NextResponse.json({ quotes: [] }, { status: 400 });

  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ quotes: [] }, { status: 500 });

  try {
    const res = await fetch(
      `${BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const quotes = Array.isArray(data) ? data : [];
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ quotes: [] });
  }
}
