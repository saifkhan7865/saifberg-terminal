import { NextRequest, NextResponse } from 'next/server';
import { getNews } from '@/lib/fmp';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ news: [] });

  const apiKey = req.headers.get('x-fmp-key') || undefined;

  try {
    const articles = await getNews(symbol.toUpperCase(), 15, apiKey);
    const news = articles.map(a => ({
      title: a.title,
      publisher: a.site,
      link: a.url,
      providerPublishTime: Math.floor(new Date(a.publishedDate).getTime() / 1000),
      thumbnail: a.image ? { resolutions: [{ url: a.image, width: 200 }] } : undefined,
    }));
    return NextResponse.json({ news });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch news';
    return NextResponse.json({ error: msg, news: [] }, { status: 500 });
  }
}
