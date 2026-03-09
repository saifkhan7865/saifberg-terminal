import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return NextResponse.json({ error: 'Gemini API key not configured. Add your key in Settings ⚙' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { symbol, fundamentals, quote } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fmt = (v: unknown, suffix = '', decimals = 2) =>
      v != null ? `${(+v).toFixed(decimals)}${suffix}` : 'N/A';
    const fmtPct = (v: unknown) => v != null ? `${(+v * 100).toFixed(1)}%` : 'N/A';
    const fmtB = (v: unknown) => {
      if (v == null) return 'N/A';
      const n = +v;
      if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
      if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      return `$${n.toFixed(0)}`;
    };

    const ratingMap: Record<string, string> = {
      'strongBuy': 'STRONG BUY',
      'buy': 'BUY',
      'hold': 'HOLD',
      'sell': 'SELL',
      'strongSell': 'STRONG SELL',
    };

    const prompt = `You are a senior Bloomberg terminal analyst. Provide a sharp, professional stock analysis in terminal style.

TICKER: ${symbol}
COMPANY: ${fundamentals?.longName || fundamentals?.shortName || symbol}
SECTOR: ${fundamentals?.sector || 'N/A'}
INDUSTRY: ${fundamentals?.industry || 'N/A'}

MARKET DATA:
- Current Price: ${fmtB(quote?.regularMarketPrice)}
- Day Change: ${fmt(quote?.regularMarketChangePercent, '%')} (${fmtB(quote?.regularMarketChange)})
- Volume: ${quote?.regularMarketVolume?.toLocaleString() || 'N/A'}
- Market Cap: ${fmtB(fundamentals?.marketCap)}
- 52-Week Range: ${fmtB(fundamentals?.fiftyTwoWeekLow)} – ${fmtB(fundamentals?.fiftyTwoWeekHigh)}
- Beta: ${fmt(fundamentals?.beta)}

VALUATION:
- Trailing P/E: ${fmt(fundamentals?.trailingPE)}x
- Forward P/E: ${fmt(fundamentals?.forwardPE)}x
- PEG Ratio: ${fmt(fundamentals?.pegRatio)}
- Price/Book: ${fmt(fundamentals?.priceToBook)}x
- EV/EBITDA: ${fmt(fundamentals?.enterpriseToEbitda)}x
- EPS (TTM): $${fmt(fundamentals?.trailingEps)}
- Forward EPS: $${fmt(fundamentals?.forwardEps)}

GROWTH & PROFITABILITY:
- Revenue Growth (YoY): ${fmtPct(fundamentals?.revenueGrowth)}
- Earnings Growth: ${fmtPct(fundamentals?.earningsGrowth)}
- Gross Margin: ${fmtPct(fundamentals?.grossMargins)}
- Operating Margin: ${fmtPct(fundamentals?.operatingMargins)}
- Net Profit Margin: ${fmtPct(fundamentals?.profitMargins)}
- Total Revenue: ${fmtB(fundamentals?.totalRevenue)}
- Free Cash Flow: ${fmtB(fundamentals?.freeCashflow)}

BALANCE SHEET:
- Debt/Equity: ${fmt(fundamentals?.debtToEquity)}
- Current Ratio: ${fmt(fundamentals?.currentRatio)}
- Quick Ratio: ${fmt(fundamentals?.quickRatio)}
- Total Cash: ${fmtB(fundamentals?.totalCash)}
- Total Debt: ${fmtB(fundamentals?.totalDebt)}

ANALYST CONSENSUS:
- Rating: ${ratingMap[fundamentals?.recommendationKey] || fundamentals?.recommendationKey || 'N/A'} (${fmt(fundamentals?.recommendationMean)}/5.0)
- # Analysts: ${fundamentals?.numberOfAnalystOpinions || 'N/A'}
- Buy: ${fundamentals?.analystBuy || 'N/A'} | Hold: ${fundamentals?.analystHold || 'N/A'} | Sell: ${fundamentals?.analystSell || 'N/A'}
- Price Target: ${fmtB(fundamentals?.targetMeanPrice)} (Range: ${fmtB(fundamentals?.targetLowPrice)}–${fmtB(fundamentals?.targetHighPrice)})
${fundamentals?.targetMeanPrice && quote?.regularMarketPrice
  ? `- Upside to Target: ${(((fundamentals.targetMeanPrice - quote.regularMarketPrice) / quote.regularMarketPrice) * 100).toFixed(1)}%`
  : ''}

SHORT INTEREST:
- Short % Float: ${fmtPct(fundamentals?.shortPercentOfFloat)}
- Short Ratio: ${fmt(fundamentals?.shortRatio)}x

DIVIDENDS:
- Yield: ${fmtPct(fundamentals?.dividendYield)}
- Annual Rate: $${fmt(fundamentals?.dividendRate)}
- Payout Ratio: ${fmtPct(fundamentals?.payoutRatio)}

Provide EXACTLY this structure (no markdown headers with #, use ALL CAPS labels as shown):

EXECUTIVE SUMMARY
[2-3 punchy sentences covering the core investment story]

BULL CASE
[+] [Point 1 - specific metric-backed reason to be bullish]
[+] [Point 2]
[+] [Point 3]

BEAR CASE
[-] [Point 1 - specific metric-backed risk]
[-] [Point 2]
[-] [Point 3]

KEY CATALYSTS
[~] [Catalyst 1 with expected timing]
[~] [Catalyst 2]

TECHNICAL PICTURE
[Analysis of 52-week position, momentum, volume trends]

VERDICT
Rating: [STRONG BUY / BUY / HOLD / SELL / STRONG SELL]
Price Target: $[low] – $[high] (12-month)
Upside/Downside: [X]% from current
Conviction: [HIGH / MEDIUM / LOW]
Key Risk: [single biggest risk in one sentence]

Keep it sharp, data-driven, and under 400 words total. No disclaimers. Pure alpha.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ analysis: text, symbol });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
