import { NextRequest, NextResponse } from 'next/server';
import { getEarningsCalendar } from '@/lib/finnhub';
import { format, subDays, addDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-finnhub-key') || undefined;
  const symbol = req.nextUrl.searchParams.get('symbol') || undefined;

  // For a specific company, fetch a wider historical + future range
  const from = symbol
    ? format(subDays(new Date(), 365 * 3), 'yyyy-MM-dd')
    : format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), 90), 'yyyy-MM-dd');

  try {
    const earnings = await getEarningsCalendar(from, to, apiKey, symbol);
    return NextResponse.json({ earnings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch earnings calendar';
    return NextResponse.json({ error: msg, earnings: [] }, { status: 500 });
  }
}
