import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return NextResponse.json({ error: 'Gemini API key not configured. Add your key in Settings ⚙' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { symbol, question, fundamentals, quote, analysisContext } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fmtB = (v: unknown) => {
      if (v == null) return 'N/A';
      const n = +v as number;
      if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
      if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
      if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
      return `$${n.toFixed(0)}`;
    };

    const context = [
      `TICKER: ${symbol}`,
      `COMPANY: ${fundamentals?.longName || fundamentals?.shortName || symbol}`,
      `SECTOR: ${fundamentals?.sector || 'N/A'}`,
      `CURRENT PRICE: ${quote?.regularMarketPrice != null ? `$${(+quote.regularMarketPrice).toFixed(2)}` : 'N/A'}`,
      `DAY CHANGE: ${quote?.regularMarketChangePercent != null ? `${(+quote.regularMarketChangePercent).toFixed(2)}%` : 'N/A'}`,
      `VOLUME: ${quote?.regularMarketVolume?.toLocaleString() || 'N/A'} (avg: ${quote?.averageVolume?.toLocaleString() || 'N/A'})`,
      `MARKET CAP: ${fmtB(fundamentals?.marketCap)}`,
      `52W RANGE: ${fmtB(fundamentals?.fiftyTwoWeekLow)} – ${fmtB(fundamentals?.fiftyTwoWeekHigh)}`,
      `P/E TTM: ${fundamentals?.trailingPE != null ? `${(+fundamentals.trailingPE).toFixed(1)}x` : 'N/A'}`,
      `FORWARD P/E: ${fundamentals?.forwardPE != null ? `${(+fundamentals.forwardPE).toFixed(1)}x` : 'N/A'}`,
      `NET MARGIN: ${fundamentals?.profitMargins != null ? `${(+fundamentals.profitMargins * 100).toFixed(1)}%` : 'N/A'}`,
      `BETA: ${fundamentals?.beta != null ? (+fundamentals.beta).toFixed(2) : 'N/A'}`,
      `ANALYST CONSENSUS: ${fundamentals?.recommendationKey || 'N/A'} (target: ${fmtB(fundamentals?.targetMeanPrice)})`,
      analysisContext ? `\nPREVIOUS ANALYSIS:\n${analysisContext}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `You are a sharp, no-nonsense financial analyst on a Bloomberg terminal. A trader just asked you a question about ${symbol}.

STOCK CONTEXT:
${context}

TRADER'S QUESTION: ${question}

Answer directly and concisely — like a senior analyst on a trading floor. Use specific numbers from the context when relevant. Be direct, skip disclaimers, give your honest view. 2-4 sentences max. If asked about intraday moves (up/down today), reason from volume, beta, sector and market context. Keep it sharp and professional.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return NextResponse.json({ answer });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
