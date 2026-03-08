import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'FMP API key not configured', mergers: [] }, { status: 500 });

  try {
    const res = await fetch(
      `${BASE}/mergers-acquisitions?apikey=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    if (data?.['Error Message']) throw new Error(data['Error Message']);
    const mergers = Array.isArray(data) ? data.slice(0, 20) : [];
    return NextResponse.json({ mergers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch M&A data';
    return NextResponse.json({ error: msg, mergers: [] }, { status: 500 });
  }
}
