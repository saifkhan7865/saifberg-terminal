import { NextRequest, NextResponse } from 'next/server';
import { getGainers, getLosers, getMostActive } from '@/lib/fmp';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY || undefined;

  try {
    const [gainersRes, losersRes, activesRes] = await Promise.allSettled([
      getGainers(apiKey),
      getLosers(apiKey),
      getMostActive(apiKey),
    ]);

    const gainers = gainersRes.status === 'fulfilled' ? gainersRes.value : [];
    const losers  = losersRes.status  === 'fulfilled' ? losersRes.value  : [];
    const actives = activesRes.status === 'fulfilled' ? activesRes.value : [];

    const fmt = (m: { symbol: string; name: string; price: number; change: number; changesPercentage: number }) => ({
      symbol: m.symbol,
      shortName: m.name,
      price: m.price,
      change: m.change,
      changePercent: m.changesPercentage,
      volume: null,
    });

    return NextResponse.json({ gainers: gainers.map(fmt), losers: losers.map(fmt), actives: actives.map(fmt) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch market data';
    return NextResponse.json({ error: msg, gainers: [], losers: [], actives: [] });
  }
}
