import { NextRequest, NextResponse } from 'next/server';
import { getQuotes, getGainers, getLosers, getMostActive } from '@/lib/fmp';

const INDEX_SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX', 'GC=F', 'CL=F', 'BTC-USD'];
const INDEX_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500', '^DJI': 'DOW', '^IXIC': 'NASDAQ',
  '^RUT': 'RUSSELL 2K', '^VIX': 'VIX', 'GC=F': 'GOLD',
  'CL=F': 'OIL (WTI)', 'BTC-USD': 'BTC/USD',
};

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || undefined;

  try {
    const [indexRes, gainersRes, losersRes, activesRes] = await Promise.allSettled([
      getQuotes(INDEX_SYMBOLS, apiKey),
      getGainers(apiKey),
      getLosers(apiKey),
      getMostActive(apiKey),
    ]);

    const indexQuotes = indexRes.status === 'fulfilled' ? indexRes.value : [];
    const gainers = gainersRes.status === 'fulfilled' ? gainersRes.value : [];
    const losers = losersRes.status === 'fulfilled' ? losersRes.value : [];
    const actives = activesRes.status === 'fulfilled' ? activesRes.value : [];

    const indices = INDEX_SYMBOLS.map(sym => {
      const q = indexQuotes.find(q => q.symbol === sym);
      return {
        symbol: sym,
        name: INDEX_NAMES[sym] || sym,
        price: q?.price ?? null,
        change: q?.change ?? null,
        changePercent: q?.changesPercentage ?? null,
      };
    });

    const fmt = (m: { symbol: string; name: string; price: number; change: number; changesPercentage: number }) => ({
      symbol: m.symbol,
      shortName: m.name,
      price: m.price,
      change: m.change,
      changePercent: m.changesPercentage,
      volume: null,
    });

    return NextResponse.json({ indices, gainers: gainers.map(fmt), losers: losers.map(fmt), actives: actives.map(fmt) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch market data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
