import { NextRequest, NextResponse } from 'next/server';
import { getHistorical } from '@/lib/fmp';
import { format, subDays, subMonths, subYears } from 'date-fns';

function getRangeParams(range: string): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  const to = fmt(today);

  const fromMap: Record<string, Date> = {
    '1d':  subDays(today, 2),
    '5d':  subDays(today, 7),
    '1mo': subMonths(today, 1),
    '3mo': subMonths(today, 3),
    '6mo': subMonths(today, 6),
    '1y':  subYears(today, 1),
    '5y':  subYears(today, 5),
  };

  return { from: fmt(fromMap[range] ?? subMonths(today, 1)), to };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const range = req.nextUrl.searchParams.get('range') || '1mo';
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  const apiKey = req.headers.get('x-fmp-key') || undefined;

  try {
    const { from, to } = getRangeParams(range);
    const historical = await getHistorical(symbol.toUpperCase(), from, to, apiKey);

    const quotes = historical
      .slice()
      .reverse() // FMP returns newest first, we want oldest first
      .map(bar => ({
        date: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));

    return NextResponse.json({ quotes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch chart data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
