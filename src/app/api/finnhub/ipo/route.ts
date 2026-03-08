import { NextRequest, NextResponse } from 'next/server';
import { getIPOCalendar } from '@/lib/finnhub';
import { format, addMonths } from 'date-fns';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-finnhub-key') || undefined;
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addMonths(new Date(), 3), 'yyyy-MM-dd');

  try {
    const ipos = await getIPOCalendar(from, to, apiKey);
    return NextResponse.json({ ipos });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch IPO calendar';
    return NextResponse.json({ error: msg, ipos: [] }, { status: 500 });
  }
}
