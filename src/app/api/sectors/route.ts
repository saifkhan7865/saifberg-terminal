import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

// Sector ETFs — these give us sector performance via individual quotes
const SECTOR_ETFS = [
  { symbol: 'XLK',  name: 'Technology',             shortName: 'TECH'  },
  { symbol: 'XLF',  name: 'Financial Services',     shortName: 'FIN'   },
  { symbol: 'XLE',  name: 'Energy',                 shortName: 'ENRG'  },
  { symbol: 'XLV',  name: 'Healthcare',             shortName: 'HLTH'  },
  { symbol: 'XLI',  name: 'Industrials',            shortName: 'INDU'  },
  { symbol: 'XLP',  name: 'Consumer Defensive',     shortName: 'STPL'  },
  { symbol: 'XLY',  name: 'Consumer Cyclical',      shortName: 'DISC'  },
  { symbol: 'XLRE', name: 'Real Estate',            shortName: 'RLST'  },
  { symbol: 'XLB',  name: 'Basic Materials',        shortName: 'MATL'  },
  { symbol: 'XLC',  name: 'Communication Services', shortName: 'COMM'  },
  { symbol: 'XLU',  name: 'Utilities',              shortName: 'UTIL'  },
];

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ sectors: [] });

  try {
    const symbols = SECTOR_ETFS.map(s => s.symbol).join(',');
    const res = await fetch(
      `${BASE}/quote?symbol=${symbols}&apikey=${apiKey}`,
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return NextResponse.json({ sectors: [] });

    const quotes: { symbol: string; changesPercentage: number; price: number }[] = await res.json();
    if (!Array.isArray(quotes)) return NextResponse.json({ sectors: [] });

    const quoteMap: Record<string, { changesPercentage: number; price: number }> = {};
    for (const q of quotes) quoteMap[q.symbol] = q;

    const sectors = SECTOR_ETFS.map(s => ({
      symbol: s.symbol,
      name: s.name,
      shortName: s.shortName,
      price: quoteMap[s.symbol]?.price ?? null,
      change: null,
      changePercent: quoteMap[s.symbol]?.changesPercentage ?? null,
      ytdChange: null,
    }));

    return NextResponse.json({ sectors });
  } catch {
    return NextResponse.json({ sectors: [] });
  }
}
