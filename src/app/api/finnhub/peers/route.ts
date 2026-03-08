import { NextRequest, NextResponse } from 'next/server';
import { getCompanyPeers } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol required', peers: [] }, { status: 400 });

  const apiKey = req.headers.get('x-finnhub-key') || undefined;

  try {
    const peers = await getCompanyPeers(symbol.toUpperCase(), apiKey);
    return NextResponse.json({ peers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch peers';
    return NextResponse.json({ error: msg, peers: [] }, { status: 500 });
  }
}
