import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { gdp, gdpPrev, cpi, cpiPrev, inflation, inflationPrev, unemployment, unemploymentPrev, sentiment, sentimentPrev, treasury } = body;

    const spread10y2y = treasury ? ((treasury.year10 ?? 0) - (treasury.year2 ?? 0)).toFixed(2) : 'N/A';
    const inverted = treasury && treasury.year2 > treasury.year10;

    const prompt = `You are a macro economist and market strategist. Analyze these latest US economic indicators and give a sharp, data-driven macro outlook.

ECONOMIC DATA:
- GDP (Quarterly): ${gdp?.value?.toLocaleString() ?? 'N/A'} (prev: ${gdpPrev?.value?.toLocaleString() ?? 'N/A'})
- CPI: ${cpi?.value ?? 'N/A'} (prev: ${cpiPrev?.value ?? 'N/A'})
- Inflation Rate: ${inflation?.value ?? 'N/A'}% (prev: ${inflationPrev?.value ?? 'N/A'}%)
- Unemployment: ${unemployment?.value ?? 'N/A'}% (prev: ${unemploymentPrev?.value ?? 'N/A'}%)
- Consumer Sentiment: ${sentiment?.value ?? 'N/A'} (prev: ${sentimentPrev?.value ?? 'N/A'})
- 10Y Treasury: ${treasury?.year10 ?? 'N/A'}% | 2Y Treasury: ${treasury?.year2 ?? 'N/A'}%
- 10Y-2Y Spread: ${spread10y2y}% (${inverted ? 'INVERTED — recession signal' : 'normal'})

Respond in EXACTLY this format (NO markdown, NO #, ALL CAPS labels):

MACRO SIGNAL
[BULLISH / BEARISH / MIXED]: [1 sentence verdict — what do these numbers collectively tell us about where we're headed?]

WHAT THIS MEANS FOR MARKETS
[2-3 sentences: What are the direct market implications? Should investors be cautious or confident? What sectors/assets benefit or suffer?]

KEY RISKS AHEAD
[~] [Most important macro risk in one sentence]
[~] [Second risk]
[~] [Third risk]

FED WATCH
[1-2 sentences: What is the Fed likely to do based on this data? Rate hike, hold, or cut? And when?]

ONE YEAR OUTLOOK
[1-2 sentences: If these trends continue, where does the economy end up in 12 months? Good or bad for stock market?]

Be specific, use the actual numbers. Max 200 words total. No disclaimers.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return NextResponse.json({ analysis: result.response.text() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI macro analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
