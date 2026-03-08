import { NextRequest, NextResponse } from 'next/server';
import { getCompanyNews } from '@/lib/finnhub';
import { format, subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol required', news: [] }, { status: 400 });

  const apiKey = req.headers.get('x-finnhub-key') || undefined;
  const to = format(new Date(), 'yyyy-MM-dd');
  const from = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  try {
    const news = await getCompanyNews(symbol.toUpperCase(), from, to, apiKey);
    return NextResponse.json({ news });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch company news';
    return NextResponse.json({ error: msg, news: [] }, { status: 500 });
  }
}
