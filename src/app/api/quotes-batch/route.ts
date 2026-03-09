import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

// FMP stable API returns changePercentage (no 's') — normalise on the way out
function normalise(q: Record<string, unknown>) {
  return {
    ...q,
    changesPercentage: q.changesPercentage ?? q.changePercentage ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) return NextResponse.json({ quotes: [] }, { status: 400 });

  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ quotes: [] }, { status: 500 });

  try {
    // FMP /stable/quote?symbol=A,B returns [] for multiple symbols — fetch individually
    const syms = symbols.split(',').map(s => s.trim()).filter(Boolean);
    const results = await Promise.allSettled(
      syms.map(sym =>
        fetch(`${BASE}/quote?symbol=${encodeURIComponent(sym)}&apikey=${apiKey}`, { cache: 'no-store' })
          .then(r => r.json())
          .then((d: unknown[]) => (Array.isArray(d) && d[0] ? normalise(d[0] as Record<string, unknown>) : null))
      )
    );
    const quotes = results
      .filter(r => r.status === 'fulfilled' && r.value != null)
      .map(r => (r as PromiseFulfilledResult<unknown>).value);
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ quotes: [] });
  }
}
