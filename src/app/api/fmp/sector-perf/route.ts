import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

// ETF proxies for real-time today's % change
const ETF_MAP = [
  { symbol: 'XLK',  fmpSector: 'Technology',             shortName: 'TECH',  name: 'Technology' },
  { symbol: 'XLF',  fmpSector: 'Financial Services',     shortName: 'FIN',   name: 'Financials' },
  { symbol: 'XLE',  fmpSector: 'Energy',                  shortName: 'ENRG',  name: 'Energy' },
  { symbol: 'XLV',  fmpSector: 'Healthcare',              shortName: 'HLTH',  name: 'Healthcare' },
  { symbol: 'XLI',  fmpSector: 'Industrials',             shortName: 'INDU',  name: 'Industrials' },
  { symbol: 'XLP',  fmpSector: 'Consumer Defensive',      shortName: 'STPL',  name: 'Consumer Staples' },
  { symbol: 'XLY',  fmpSector: 'Consumer Cyclical',       shortName: 'DISC',  name: 'Consumer Disc.' },
  { symbol: 'XLRE', fmpSector: 'Real Estate',             shortName: 'RLST',  name: 'Real Estate' },
  { symbol: 'XLB',  fmpSector: 'Basic Materials',         shortName: 'MATL',  name: 'Materials' },
  { symbol: 'XLC',  fmpSector: 'Communication Services',  shortName: 'COMM',  name: 'Comm. Services' },
  { symbol: 'XLU',  fmpSector: 'Utilities',               shortName: 'UTIL',  name: 'Utilities' },
];

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ sectors: [] }, { status: 500 });

  try {
    // FMP stable /quote returns [] for comma-separated batch — fetch each ETF individually
    const [etfResults, ...histResults] = await Promise.allSettled([
      Promise.all(
        ETF_MAP.map(e =>
          fetch(`${BASE}/quote?symbol=${e.symbol}&apikey=${apiKey}`, { cache: 'no-store' })
            .then(r => r.json())
            .then((d: { symbol: string; changePercentage?: number; changesPercentage?: number }[]) =>
              Array.isArray(d) && d[0]
                ? { symbol: e.symbol, pct: d[0].changePercentage ?? d[0].changesPercentage ?? 0 }
                : { symbol: e.symbol, pct: 0 }
            )
        )
      ),
      ...ETF_MAP.map(e =>
        fetch(`${BASE}/historical-sector-performance?sector=${encodeURIComponent(e.fmpSector)}&limit=32&apikey=${apiKey}`, { next: { revalidate: 3600 } })
          .then(r => r.json())
          .then((data: { averageChange: number }[]) => ({ fmpSector: e.fmpSector, data: Array.isArray(data) ? data : [] }))
      ),
    ]);

    // Build today's % from individual ETF quotes
    const etfQuotes: Record<string, number> = {};
    if (etfResults.status === 'fulfilled') {
      for (const q of etfResults.value) {
        etfQuotes[q.symbol] = q.pct;
      }
    }

    // Build 1M change from historical (compound daily changes)
    const hist1M: Record<string, number> = {};
    for (const result of histResults) {
      if (result.status === 'fulfilled') {
        const { fmpSector, data } = result.value as { fmpSector: string; data: { averageChange: number }[] };
        // Compound the last 30 daily changes
        const days = data.slice(0, 30);
        const compound = days.reduce((acc, d) => acc * (1 + (d.averageChange ?? 0) / 100), 1);
        hist1M[fmpSector] = (compound - 1) * 100;
      }
    }

    const sectors = ETF_MAP.map(e => ({
      symbol:      e.symbol,
      fmpSector:   e.fmpSector,
      name:        e.name,
      shortName:   e.shortName,
      changePercent: etfQuotes[e.symbol] ?? null,
      change1M:    hist1M[e.fmpSector] ?? null,
    }));

    return NextResponse.json({ sectors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ sectors: [], error: msg }, { status: 500 });
  }
}
