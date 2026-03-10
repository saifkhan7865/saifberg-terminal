import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 400 });

  const { headline, summary, source } = await req.json();
  if (!headline) return NextResponse.json({ error: 'Missing headline' }, { status: 400 });

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a senior financial analyst. Analyze this market news article and provide a concise, insightful review.

HEADLINE: ${headline}
SOURCE: ${source || 'Unknown'}
SUMMARY: ${summary || 'No summary provided'}

Respond in this exact JSON format (no markdown):
{
  "importance": "HIGH" | "MEDIUM" | "LOW",
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "review": "2-3 sentence analysis of what this means for markets and investors",
  "affected": ["sector or asset most affected", "another if relevant"],
  "action": "One clear takeaway for an investor (what to watch or do)"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code blocks if present
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
