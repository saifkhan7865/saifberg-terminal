import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://financialmodelingprep.com/stable';

function calcEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = values[0];
  result.push(ema);
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-fmp-key') || process.env.FMP_API_KEY;
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!apiKey || !symbol) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  try {
    const [rsiRes, sma20Res, sma50Res, sma200Res, ema12Res, ema26Res] = await Promise.all([
      fetch(`${BASE}/technical-indicators/rsi?symbol=${symbol}&periodLength=14&timeframe=1day&limit=30&apikey=${apiKey}`, { next: { revalidate: 300 } }).then(r => r.json()),
      fetch(`${BASE}/technical-indicators/sma?symbol=${symbol}&periodLength=20&timeframe=1day&limit=1&apikey=${apiKey}`, { next: { revalidate: 300 } }).then(r => r.json()),
      fetch(`${BASE}/technical-indicators/sma?symbol=${symbol}&periodLength=50&timeframe=1day&limit=1&apikey=${apiKey}`, { next: { revalidate: 300 } }).then(r => r.json()),
      fetch(`${BASE}/technical-indicators/sma?symbol=${symbol}&periodLength=200&timeframe=1day&limit=1&apikey=${apiKey}`, { next: { revalidate: 300 } }).then(r => r.json()),
      fetch(`${BASE}/technical-indicators/ema?symbol=${symbol}&periodLength=12&timeframe=1day&limit=35&apikey=${apiKey}`, { next: { revalidate: 300 } }).then(r => r.json()),
      fetch(`${BASE}/technical-indicators/ema?symbol=${symbol}&periodLength=26&timeframe=1day&limit=35&apikey=${apiKey}`, { next: { revalidate: 300 } }).then(r => r.json()),
    ]);

    const rsiData = Array.isArray(rsiRes) ? rsiRes : [];
    const price   = rsiData[0]?.close ?? null;
    const rsi     = rsiData[0]?.rsi   ?? null;
    const sma20   = Array.isArray(sma20Res)  && sma20Res[0]  ? sma20Res[0].sma   : null;
    const sma50   = Array.isArray(sma50Res)  && sma50Res[0]  ? sma50Res[0].sma   : null;
    const sma200  = Array.isArray(sma200Res) && sma200Res[0] ? sma200Res[0].sma  : null;

    // Build MACD from EMA12 - EMA26 (match by date)
    const ema12Map: Record<string, number> = {};
    const ema26Map: Record<string, number> = {};
    if (Array.isArray(ema12Res)) ema12Res.forEach((d: { date: string; ema: number }) => { ema12Map[d.date.split(' ')[0]] = d.ema; });
    if (Array.isArray(ema26Res)) ema26Res.forEach((d: { date: string; ema: number }) => { ema26Map[d.date.split(' ')[0]] = d.ema; });

    const macdDates = Object.keys(ema12Map).filter(d => ema26Map[d]).sort();
    const macdValues = macdDates.map(d => ema12Map[d] - ema26Map[d]);
    const signalValues = macdValues.length >= 9 ? calcEMA(macdValues.slice(-9), 9) : macdValues.map(() => 0);

    const macdHistory = macdDates.slice(-20).map((d, i) => ({
      date: d,
      macd: macdValues[i] ?? 0,
      signal: signalValues[i] ?? 0,
      histogram: (macdValues[i] ?? 0) - (signalValues[i] ?? 0),
    }));

    const latestMacd = macdHistory[macdHistory.length - 1] || null;

    // Generate signals
    const signals: { name: string; value: string; signal: string; detail: string }[] = [];

    if (rsi != null) {
      const sig = rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL';
      signals.push({ name: 'RSI(14)', value: rsi.toFixed(1), signal: sig, detail: rsi < 30 ? 'Oversold — potential bounce' : rsi > 70 ? 'Overbought — may pull back' : 'Neutral zone (30-70)' });
    }
    if (sma20 != null && price != null) {
      const sig = price > sma20 ? 'BULLISH' : 'BEARISH';
      signals.push({ name: 'SMA 20', value: sma20.toFixed(2), signal: sig, detail: price > sma20 ? `Price $${price.toFixed(2)} above 20-day MA` : `Price $${price.toFixed(2)} below 20-day MA` });
    }
    if (sma50 != null && price != null) {
      const sig = price > sma50 ? 'BULLISH' : 'BEARISH';
      signals.push({ name: 'SMA 50', value: sma50.toFixed(2), signal: sig, detail: price > sma50 ? `Above 50-day MA — medium-term uptrend` : `Below 50-day MA — medium-term downtrend` });
    }
    if (sma200 != null && price != null) {
      const sig = price > sma200 ? 'BULLISH' : 'BEARISH';
      signals.push({ name: 'SMA 200', value: sma200.toFixed(2), signal: sig, detail: price > sma200 ? `Above 200-day MA — long-term uptrend` : `Below 200-day MA — long-term downtrend` });
    }
    if (latestMacd) {
      const sig = latestMacd.histogram > 0 ? 'BULLISH' : 'BEARISH';
      signals.push({ name: 'MACD', value: latestMacd.macd.toFixed(2), signal: sig, detail: latestMacd.histogram > 0 ? 'MACD above signal — bullish momentum' : 'MACD below signal — bearish momentum' });
    }

    const bullishCount = signals.filter(s => s.signal === 'BULLISH' || s.signal === 'OVERSOLD').length;
    const bearishCount = signals.filter(s => s.signal === 'BEARISH' || s.signal === 'OVERBOUGHT').length;
    const overallSignal = bullishCount > bearishCount ? 'BULLISH' : bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';

    return NextResponse.json({
      price, rsi, rsiHistory: rsiData.slice(0, 30).map((d: { date: string; rsi: number; close: number }) => ({
        date: d.date?.split(' ')[0], rsi: d.rsi, close: d.close,
      })).reverse(),
      sma20, sma50, sma200,
      macd: latestMacd,
      macdHistory: macdHistory.slice(-20),
      signals,
      overallSignal,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
