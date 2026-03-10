import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

// Fetch unusual options activity for a set of high-volume tickers in parallel
const WATCH_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'META', 'AMD', 'AMZN', 'GOOGL'];

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'FMP API key not configured', flows: [] }, { status: 500 });

  const symbol = req.nextUrl.searchParams.get('symbol');
  const symbols = symbol ? [symbol.toUpperCase()] : WATCH_SYMBOLS;

  try {
    const results = await Promise.allSettled(
      symbols.map(sym =>
        fetch(`${BASE}/unusual-activity?symbol=${sym}&apikey=${apiKey}`, { next: { revalidate: 300 } })
          .then(r => r.json())
          .then(data => (Array.isArray(data) ? data.map((d: Record<string, unknown>) => ({ ...d, symbol: sym })) : []))
          .catch(() => [])
      )
    );

    const flows = results
      .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
      // Sort by total premium descending
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.totalPremium as number) ?? 0) - ((a.totalPremium as number) ?? 0)
      )
      .slice(0, 50);

    return NextResponse.json({ flows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch options flow';
    return NextResponse.json({ error: msg, flows: [] }, { status: 500 });
  }
}
