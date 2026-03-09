import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  const indicators = ['GDP', 'CPI', 'inflationRate', 'unemploymentRate', 'consumerSentiment', 'retailSales'];

  try {
    const [treasury, ...indResults] = await Promise.allSettled([
      fetch(`${BASE}/treasury-rates?limit=1&apikey=${apiKey}`, { next: { revalidate: 3600 } }).then(r => r.json()),
      ...indicators.map(name =>
        fetch(`${BASE}/economic-indicators?name=${name}&limit=2&apikey=${apiKey}`, { next: { revalidate: 3600 } }).then(r => r.json())
      ),
    ]);

    const macro: Record<string, { name: string; date: string; value: number } | null> = {};
    const macroPrev: Record<string, { name: string; date: string; value: number } | null> = {};

    indicators.forEach((name, i) => {
      const res = indResults[i];
      const key = name.toLowerCase();
      if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
        macro[key] = res.value[0];
        macroPrev[key] = res.value[1] || null;
      } else {
        macro[key] = null;
        macroPrev[key] = null;
      }
    });

    return NextResponse.json({
      gdp:              macro['gdp'],
      gdpPrev:          macroPrev['gdp'],
      cpi:              macro['cpi'],
      cpiPrev:          macroPrev['cpi'],
      inflation:        macro['inflationrate'],
      inflationPrev:    macroPrev['inflationrate'],
      unemployment:     macro['unemploymentrate'],
      unemploymentPrev: macroPrev['unemploymentrate'],
      sentiment:        macro['consumersentiment'],
      sentimentPrev:    macroPrev['consumersentiment'],
      retailSales:      macro['retailsales'],
      retailSalesPrev:  macroPrev['retailsales'],
      treasury: treasury.status === 'fulfilled' ? (treasury.value?.[0] || null) : null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
