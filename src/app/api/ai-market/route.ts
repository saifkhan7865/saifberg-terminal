import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { sectors, news, indices } = body;

    const sectorLines = (sectors || [])
      .map((s: { shortName: string; name: string; changePercent: number; change1M?: number }) => {
        const today = `${s.changePercent >= 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`;
        const m1    = s.change1M != null ? ` | 1M: ${s.change1M >= 0 ? '+' : ''}${s.change1M.toFixed(1)}%` : '';
        return `${s.name}: ${today}${m1}`;
      })
      .join('\n');

    const newsLines = (news || [])
      .slice(0, 10)
      .map((n: { headline: string; source: string }, i: number) => `${i + 1}. [${n.source}] ${n.headline}`)
      .join('\n');

    const indexLines = (indices || [])
      .map((idx: { label: string; price: number; changesPercentage: number }) =>
        `${idx.label}: $${idx.price?.toFixed(2)} (${idx.changesPercentage >= 0 ? '+' : ''}${idx.changesPercentage?.toFixed(2)}%)`)
      .join('  |  ');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a Bloomberg Markets analyst. Today's live market data is shown below. Provide a sharp, actionable daily market brief.

MAJOR INDICES TODAY:
${indexLines}

SECTOR PERFORMANCE TODAY:
${sectorLines}

TOP NEWS HEADLINES:
${newsLines}

Respond in EXACTLY this format (ALL CAPS labels, no markdown #):

MARKET PREDICTION
[2-3 sentences: What is likely to happen in the market today and tomorrow? Based on the news, sector momentum (today + 1M trend), and index moves — give a directional call: bullish/bearish/sideways with reasoning]

MARKET MOOD
[1-2 sentences: overall market tone — risk-on/risk-off, breadth, key driver today]

SECTOR TO WATCH
[SECTOR NAME]: [Best sector to put money in RIGHT NOW — use both today's % AND the 1M trend to justify, 1-2 sentences]
[SECTOR NAME]: [Runner-up sector, brief reason]

TOP STOCK OPPORTUNITY
[TICKER]: [Best stock to look at given today's sector/news, and why — specific, 1-2 sentences]

KEY CATALYSTS
[~] [Top market-moving factor today]
[~] [Second catalyst]
[~] [Third catalyst]

RISK ALERT
[Single biggest risk to market today in 1 sentence]

Be specific, data-driven, use the actual % numbers. Max 250 words total. No disclaimers. Focus on actionable calls.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return NextResponse.json({ analysis: text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI market analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
