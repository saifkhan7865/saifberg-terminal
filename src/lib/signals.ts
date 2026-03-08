import { FundamentalsData, QuoteData, SignalResult } from './types';

export function calculateSignal(
  fundamentals: FundamentalsData,
  quote: QuoteData
): SignalResult {
  let score = 0;
  const reasons: { text: string; positive: boolean }[] = [];

  // 1. Valuation: Trailing P/E
  const pe = fundamentals.trailingPE;
  if (pe != null && pe > 0) {
    if (pe < 12) { score += 3; reasons.push({ text: `Very low P/E of ${pe.toFixed(1)}x (deep value)`, positive: true }); }
    else if (pe < 20) { score += 2; reasons.push({ text: `Attractive P/E of ${pe.toFixed(1)}x`, positive: true }); }
    else if (pe < 30) { score += 1; reasons.push({ text: `Fair P/E of ${pe.toFixed(1)}x`, positive: true }); }
    else if (pe < 45) { score -= 1; reasons.push({ text: `Elevated P/E of ${pe.toFixed(1)}x`, positive: false }); }
    else if (pe < 70) { score -= 2; reasons.push({ text: `High P/E of ${pe.toFixed(1)}x (expensive)`, positive: false }); }
    else { score -= 3; reasons.push({ text: `Extreme P/E of ${pe.toFixed(1)}x (overvalued)`, positive: false }); }
  }

  // 2. Forward P/E improvement
  const fpe = fundamentals.forwardPE;
  if (pe && fpe && fpe > 0 && pe > 0) {
    const improvement = (pe - fpe) / pe;
    if (improvement > 0.15) { score += 2; reasons.push({ text: `Forward P/E ${fpe.toFixed(1)}x – strong earnings growth expected`, positive: true }); }
    else if (improvement > 0.05) { score += 1; reasons.push({ text: `Forward P/E improving to ${fpe.toFixed(1)}x`, positive: true }); }
    else if (improvement < -0.1) { score -= 1; reasons.push({ text: `Forward P/E of ${fpe.toFixed(1)}x worse than trailing`, positive: false }); }
  }

  // 3. Revenue Growth
  const revGrowth = fundamentals.revenueGrowth;
  if (revGrowth != null) {
    if (revGrowth > 0.3) { score += 3; reasons.push({ text: `Revenue growth ${(revGrowth * 100).toFixed(1)}% YoY (exceptional)`, positive: true }); }
    else if (revGrowth > 0.15) { score += 2; reasons.push({ text: `Revenue growth ${(revGrowth * 100).toFixed(1)}% YoY (strong)`, positive: true }); }
    else if (revGrowth > 0.05) { score += 1; reasons.push({ text: `Revenue growth ${(revGrowth * 100).toFixed(1)}% YoY`, positive: true }); }
    else if (revGrowth < 0) { score -= 2; reasons.push({ text: `Negative revenue growth ${(revGrowth * 100).toFixed(1)}% YoY`, positive: false }); }
  }

  // 4. Profit Margins
  const margin = fundamentals.profitMargins;
  if (margin != null) {
    if (margin > 0.25) { score += 2; reasons.push({ text: `Exceptional net margin ${(margin * 100).toFixed(1)}%`, positive: true }); }
    else if (margin > 0.12) { score += 1; reasons.push({ text: `Good net margin ${(margin * 100).toFixed(1)}%`, positive: true }); }
    else if (margin < 0) { score -= 2; reasons.push({ text: `Negative net margin ${(margin * 100).toFixed(1)}%`, positive: false }); }
  }

  // 5. Analyst Consensus (1=Strong Buy, 5=Strong Sell)
  const rec = fundamentals.recommendationMean;
  if (rec != null) {
    if (rec <= 1.5) { score += 3; reasons.push({ text: `Strong analyst consensus BUY (${rec.toFixed(1)}/5.0)`, positive: true }); }
    else if (rec <= 2.0) { score += 2; reasons.push({ text: `Analyst consensus BUY (${rec.toFixed(1)}/5.0)`, positive: true }); }
    else if (rec <= 2.5) { score += 1; reasons.push({ text: `Mild analyst BUY bias (${rec.toFixed(1)}/5.0)`, positive: true }); }
    else if (rec >= 3.5) { score -= 1; reasons.push({ text: `Analyst consensus leans SELL (${rec.toFixed(1)}/5.0)`, positive: false }); }
    else if (rec >= 4.0) { score -= 2; reasons.push({ text: `Analyst consensus SELL (${rec.toFixed(1)}/5.0)`, positive: false }); }
  }

  // 6. 52-Week Position
  const low52 = fundamentals.fiftyTwoWeekLow ?? quote.fiftyTwoWeekLow;
  const high52 = fundamentals.fiftyTwoWeekHigh ?? quote.fiftyTwoWeekHigh;
  const price = fundamentals.currentPrice ?? quote.regularMarketPrice;
  if (low52 && high52 && price && high52 > low52) {
    const position = (price - low52) / (high52 - low52);
    if (position < 0.15) { score += 2; reasons.push({ text: `Near 52-week low – potential value entry`, positive: true }); }
    else if (position < 0.35) { score += 1; reasons.push({ text: `In lower third of 52-week range`, positive: true }); }
    else if (position > 0.9) { score -= 1; reasons.push({ text: `Near 52-week high – limited upside room`, positive: false }); }
  }

  // 7. Price vs Analyst Target
  const target = fundamentals.targetMeanPrice;
  if (target && price) {
    const upside = (target - price) / price;
    if (upside > 0.25) { score += 2; reasons.push({ text: `${(upside * 100).toFixed(0)}% upside to analyst target $${target.toFixed(0)}`, positive: true }); }
    else if (upside > 0.1) { score += 1; reasons.push({ text: `${(upside * 100).toFixed(0)}% upside to consensus target`, positive: true }); }
    else if (upside < -0.1) { score -= 1; reasons.push({ text: `Stock trading above analyst target by ${(Math.abs(upside) * 100).toFixed(0)}%`, positive: false }); }
  }

  // 8. Debt/Equity
  const de = fundamentals.debtToEquity;
  if (de != null) {
    if (de < 30) { score += 1; reasons.push({ text: `Low debt/equity of ${de.toFixed(0)}% (strong balance sheet)`, positive: true }); }
    else if (de > 200) { score -= 1; reasons.push({ text: `High debt/equity of ${de.toFixed(0)}%`, positive: false }); }
    else if (de > 400) { score -= 2; reasons.push({ text: `Excessive leverage – D/E ${de.toFixed(0)}%`, positive: false }); }
  }

  // 9. Free Cash Flow
  const fcf = fundamentals.freeCashflow;
  const mcap = fundamentals.marketCap;
  if (fcf && mcap && mcap > 0) {
    const fcfYield = fcf / mcap;
    if (fcfYield > 0.06) { score += 2; reasons.push({ text: `High FCF yield of ${(fcfYield * 100).toFixed(1)}%`, positive: true }); }
    else if (fcfYield > 0.03) { score += 1; reasons.push({ text: `Solid FCF yield of ${(fcfYield * 100).toFixed(1)}%`, positive: true }); }
    else if (fcfYield < 0) { score -= 1; reasons.push({ text: `Negative free cash flow`, positive: false }); }
  }

  // Normalize score to max 10
  const maxPossible = 10;
  const clampedScore = Math.max(-maxPossible, Math.min(maxPossible, score));

  let signal: SignalResult['signal'];
  if (clampedScore >= 7) signal = 'STRONG BUY';
  else if (clampedScore >= 3) signal = 'BUY';
  else if (clampedScore >= -2) signal = 'HOLD';
  else if (clampedScore >= -5) signal = 'SELL';
  else signal = 'STRONG SELL';

  return { signal, score: clampedScore, scoreMax: maxPossible, reasons };
}
