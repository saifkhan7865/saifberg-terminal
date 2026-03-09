import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini key not configured' }, { status: 500 });

  try {
    const { earnings, news } = await req.json();

    const earningsLines = (earnings || []).slice(0, 20).map((e: {
      symbol: string; date: string; epsEstimated?: number; revenueEstimated?: number;
    }) => `${e.symbol} — ${e.date} | EPS Est: ${e.epsEstimated != null ? e.epsEstimated.toFixed(2) : 'N/A'} | Rev Est: ${e.revenueEstimated != null ? `$${(e.revenueEstimated / 1e6).toFixed(0)}M` : 'N/A'}`).join('\n');

    const newsLines = (news || []).slice(0, 8).map((n: { headline: string; source: string }, i: number) =>
      `${i + 1}. [${n.source}] ${n.headline}`).join('\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a trading analyst specializing in earnings plays. Analyze the upcoming earnings and news to identify 3 stocks most likely to beat expectations or have positive price action.

UPCOMING EARNINGS (next 2 weeks):
${earningsLines}

RECENT MARKET NEWS:
${newsLines}

Respond EXACTLY in this format (repeat the block 3 times):

EARNINGS PICK
[TICKER]: [Company Name] | Score: [X/10]
[2-3 sentences: why this stock will likely beat earnings — reference sector momentum, recent news, or company fundamentals]

Be specific. Only pick from the earnings list above. Focus on names with positive catalysts.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse the response
    const picks: { ticker: string; company: string; score: number; reason: string }[] = [];
    const blocks = text.split('EARNINGS PICK').filter(b => b.trim());
    for (const block of blocks) {
      const firstLine = block.trim().split('\n')[0];
      const rest = block.trim().split('\n').slice(1).join(' ').trim();
      const match = firstLine.match(/\[?([A-Z]+)\]?:\s*([^|]+)\|.*Score:\s*(\d+)/);
      if (match) {
        picks.push({
          ticker: match[1].trim(),
          company: match[2].trim(),
          score: parseInt(match[3]),
          reason: rest,
        });
      }
    }

    return NextResponse.json({ picks, raw: text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
