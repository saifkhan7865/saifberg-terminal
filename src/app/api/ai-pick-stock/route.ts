import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini key not configured' }, { status: 500 });

  try {
    const { risk, horizon, sector, sectors } = await req.json();

    const sectorLines = (sectors || []).map((s: {
      name: string; changePercent: number | null; change1M: number | null;
    }) => `${s.name}: Today ${s.changePercent != null ? (s.changePercent >= 0 ? '+' : '') + s.changePercent.toFixed(2) + '%' : 'N/A'} | 1M: ${s.change1M != null ? (s.change1M >= 0 ? '+' : '') + s.change1M.toFixed(1) + '%' : 'N/A'}`).join('\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a personal investment advisor for a ${risk === 'low' ? 'conservative' : risk === 'high' ? 'aggressive' : 'moderate'} investor with a ${horizon === 'short' ? 'short-term (days/weeks)' : horizon === 'long' ? 'long-term (years)' : 'medium-term (months)'} horizon${sector && sector !== 'any' ? `, interested in the ${sector} sector` : ', with no sector preference'}.

CURRENT SECTOR PERFORMANCE:
${sectorLines}

Based on this data and your knowledge of current market conditions, provide a personalized investment recommendation. Be specific and actionable.

Respond EXACTLY in this format:

RECOMMENDED SECTOR
[SECTOR NAME]: [2-3 sentences why this sector fits their profile and risk/horizon]

TOP ETF
[ETF TICKER]: [ETF name — 1-2 sentences why this ETF is the best way to get sector exposure]

STOCK PICK 1
[TICKER]: [Company name] | [Risk: LOW/MEDIUM/HIGH]
[1-2 sentences why this stock fits their profile]

STOCK PICK 2
[TICKER]: [Company name] | [Risk: LOW/MEDIUM/HIGH]
[1-2 sentences why this stock fits their profile]

STOCK PICK 3
[TICKER]: [Company name] | [Risk: LOW/MEDIUM/HIGH]
[1-2 sentences why this stock fits their profile]

TIMING
[Should they buy now, wait for a dip, or DCA? 1-2 sentences]

No disclaimers. Be direct and actionable.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse response
    const rec: {
      sector: string; sectorReason: string;
      etf: string; etfName: string; etfReason: string;
      stocks: { ticker: string; name: string; risk: string; reason: string }[];
      timing: string;
    } = { sector: '', sectorReason: '', etf: '', etfName: '', etfReason: '', stocks: [], timing: '' };

    let section = '';
    for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
      if (line.startsWith('RECOMMENDED SECTOR')) { section = 'sector'; continue; }
      if (line.startsWith('TOP ETF'))            { section = 'etf';    continue; }
      if (line.startsWith('STOCK PICK'))         { section = 'stock';  continue; }
      if (line.startsWith('TIMING'))             { section = 'timing'; continue; }

      if (section === 'sector' && line.includes(':')) {
        const col = line.indexOf(':');
        rec.sector = line.slice(0, col).trim();
        rec.sectorReason = line.slice(col + 1).trim();
      } else if (section === 'etf' && line.includes(':')) {
        const col = line.indexOf(':');
        rec.etf = line.slice(0, col).trim().replace(/\[|\]/g, '');
        const rest = line.slice(col + 1).trim();
        const dashIdx = rest.indexOf('—');
        rec.etfName = dashIdx > -1 ? rest.slice(0, dashIdx).trim() : rest;
        rec.etfReason = dashIdx > -1 ? rest.slice(dashIdx + 1).trim() : '';
      } else if (section === 'stock') {
        if (line.includes('|') && line.includes(':')) {
          const col = line.indexOf(':');
          const ticker = line.slice(0, col).trim().replace(/\[|\]/g, '');
          const rest = line.slice(col + 1);
          const parts = rest.split('|');
          const name = parts[0]?.trim() || '';
          const riskMatch = rest.match(/Risk:\s*(LOW|MEDIUM|HIGH)/i);
          const risk = riskMatch ? riskMatch[1] : 'MEDIUM';
          rec.stocks.push({ ticker, name, risk, reason: '' });
        } else if (rec.stocks.length > 0 && !line.includes(':')) {
          rec.stocks[rec.stocks.length - 1].reason += (rec.stocks[rec.stocks.length - 1].reason ? ' ' : '') + line;
        }
      } else if (section === 'timing') {
        rec.timing += (rec.timing ? ' ' : '') + line;
      }
    }

    return NextResponse.json({ recommendation: rec, raw: text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI pick failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
