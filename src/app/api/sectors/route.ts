import { NextRequest, NextResponse } from 'next/server';
import { getSectorPerformance } from '@/lib/fmp';

// FMP sector names → our display names + ETF symbols for click-through
const SECTOR_MAP: Record<string, { shortName: string; etf: string }> = {
  'Technology':             { shortName: 'TECH',  etf: 'XLK' },
  'Financial Services':     { shortName: 'FIN',   etf: 'XLF' },
  'Energy':                 { shortName: 'ENRG',  etf: 'XLE' },
  'Healthcare':             { shortName: 'HLTH',  etf: 'XLV' },
  'Industrials':            { shortName: 'INDU',  etf: 'XLI' },
  'Consumer Defensive':     { shortName: 'STPL',  etf: 'XLP' },
  'Consumer Cyclical':      { shortName: 'DISC',  etf: 'XLY' },
  'Real Estate':            { shortName: 'RLST',  etf: 'XLRE' },
  'Basic Materials':        { shortName: 'MATL',  etf: 'XLB' },
  'Communication Services': { shortName: 'COMM',  etf: 'XLC' },
  'Utilities':              { shortName: 'UTIL',  etf: 'XLU' },
};

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || undefined;

  try {
    const raw = await getSectorPerformance(apiKey);

    const sectors = raw
      .filter(s => SECTOR_MAP[s.sector])
      .map(s => {
        const map = SECTOR_MAP[s.sector];
        const pctStr = s.changesPercentage.replace('%', '').trim();
        const changePercent = parseFloat(pctStr) || 0;
        return {
          symbol: map.etf,
          name: s.sector,
          shortName: map.shortName,
          price: null,
          change: null,
          changePercent,
          ytdChange: null,
        };
      });

    return NextResponse.json({ sectors });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch sector data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
