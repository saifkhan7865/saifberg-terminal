import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!apiKey || !symbol) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  try {
    const [dcfRes, quoteRes] = await Promise.all([
      fetch(`${BASE}/discounted-cash-flow?symbol=${symbol}&apikey=${apiKey}`, { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${BASE}/quote?symbol=${symbol}&apikey=${apiKey}`, { next: { revalidate: 60 } }).then(r => r.json()),
    ]);

    const dcfData = Array.isArray(dcfRes) ? dcfRes[0] : dcfRes;
    const quoteData = Array.isArray(quoteRes) ? quoteRes[0] : quoteRes;

    if (!dcfData?.dcf) return NextResponse.json({ error: 'No DCF data' }, { status: 404 });

    const dcfValue = dcfData.dcf;
    const currentPrice = quoteData?.price || dcfData['Stock Price'] || 0;
    const upside = currentPrice > 0 ? ((dcfValue - currentPrice) / currentPrice) * 100 : 0;
    const verdict = upside > 10 ? 'UNDERVALUED' : upside < -10 ? 'OVERVALUED' : 'FAIRLY VALUED';

    return NextResponse.json({ symbol, dcfValue, currentPrice, upside, verdict, date: dcfData.date });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
