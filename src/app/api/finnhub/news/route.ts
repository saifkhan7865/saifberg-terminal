import { NextRequest, NextResponse } from 'next/server';
import { getMarketNews } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-finnhub-key') || undefined;
  const category = req.nextUrl.searchParams.get('category') || 'general';

  try {
    const news = await getMarketNews(category, apiKey);
    return NextResponse.json({ news });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch market news';
    return NextResponse.json({ error: msg, news: [] }, { status: 500 });
  }
}
