import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ earnings: [] }, { status: 500 });

  const from = req.nextUrl.searchParams.get('from') || new Date().toISOString().split('T')[0];
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 14);
  const to = req.nextUrl.searchParams.get('to') || toDate.toISOString().split('T')[0];

  try {
    const res = await fetch(
      `${BASE}/earnings-calendar?from=${from}&to=${to}&apikey=${apiKey}`,
      { next: { revalidate: 1800 } }
    );
    const data = await res.json();
    const earnings = (Array.isArray(data) ? data : [])
      .filter((e: { symbol: string }) => e.symbol && e.symbol.length <= 5 && !/[^A-Z]/.test(e.symbol))
      .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));

    return NextResponse.json({ earnings });
  } catch (err) {
    return NextResponse.json({ earnings: [], error: String(err) });
  }
}
