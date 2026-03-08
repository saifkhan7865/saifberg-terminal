import { NextRequest, NextResponse } from 'next/server';
import {
  getProfile, getQuote, getKeyMetrics, getIncomeStatement,
  getBalanceSheet, getCashFlow, getRatios, getPriceTarget,
  getRating, getRevenueGrowth,
} from '@/lib/fmp';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  const apiKey = req.headers.get('x-fmp-key') || undefined;

  try {
    const sym = symbol.toUpperCase();

    const [profileR, quoteR, kmR, incomeR, balanceR, cashR, ratiosR, ptR, ratingR, rgR] =
      await Promise.allSettled([
        getProfile(sym, apiKey), getQuote(sym, apiKey), getKeyMetrics(sym, apiKey),
        getIncomeStatement(sym, apiKey), getBalanceSheet(sym, apiKey), getCashFlow(sym, apiKey),
        getRatios(sym, apiKey), getPriceTarget(sym, apiKey), getRating(sym, apiKey), getRevenueGrowth(sym, apiKey),
      ]);

    const p  = profileR.status  === 'fulfilled' ? profileR.value  : null;
    const q  = quoteR.status    === 'fulfilled' ? quoteR.value    : null;
    const km = kmR.status       === 'fulfilled' ? kmR.value       : null;
    const is = incomeR.status   === 'fulfilled' ? incomeR.value   : null;
    const bs = balanceR.status  === 'fulfilled' ? balanceR.value  : null;
    const cf = cashR.status     === 'fulfilled' ? cashR.value     : null;
    const r  = ratiosR.status   === 'fulfilled' ? ratiosR.value   : null;
    const pt = ptR.status       === 'fulfilled' ? ptR.value       : null;
    const rt = ratingR.status   === 'fulfilled' ? ratingR.value   : null;
    const rg = rgR.status       === 'fulfilled' ? rgR.value       : null;

    const ratingMap: Record<string, number> = {
      'Strong Buy': 1.5, 'Buy': 2.0, 'Neutral': 3.0, 'Sell': 4.0, 'Strong Sell': 4.5,
    };
    const ratingText = rt?.ratingRecommendation ?? null;
    const recommendationMean = ratingText ? (ratingMap[ratingText] ?? 3.0) : null;

    const data = {
      symbol: sym,
      shortName: p?.companyName ?? q?.name ?? sym,
      longName: p?.companyName ?? q?.name ?? sym,
      sector: p?.sector ?? '',
      industry: p?.industry ?? '',
      trailingPE: q?.pe ?? km?.peRatio ?? null,
      forwardPE: null,
      priceToBook: km?.pbRatio ?? null,
      pegRatio: null,
      enterpriseToEbitda: km?.enterpriseValueOverEBITDA ?? null,
      enterpriseToRevenue: km?.evToSales ?? null,
      trailingEps: q?.eps ?? is?.epsdiluted ?? null,
      forwardEps: null,
      bookValue: km?.bookValuePerShare ?? null,
      revenueGrowth: rg,
      earningsGrowth: null,
      grossMargins: r?.grossProfitMargin ?? (is?.revenue ? is.grossProfit / is.revenue : null),
      operatingMargins: r?.operatingProfitMargin ?? (is?.revenue ? is.operatingIncome / is.revenue : null),
      profitMargins: r?.netProfitMargin ?? (is?.revenue ? is.netIncome / is.revenue : null),
      totalDebt: bs?.totalDebt ?? null,
      totalCash: bs?.cashAndShortTermInvestments ?? null,
      debtToEquity: km?.debtToEquity != null ? km.debtToEquity * 100 : r?.debtEquityRatio != null ? r.debtEquityRatio * 100 : null,
      currentRatio: km?.currentRatio ?? r?.currentRatio ?? null,
      quickRatio: r?.quickRatio ?? null,
      freeCashflow: cf?.freeCashFlow ?? null,
      operatingCashflow: cf?.operatingCashFlow ?? null,
      totalRevenue: is?.revenue ?? null,
      revenuePerShare: km?.revenuePerShare ?? null,
      dividendYield: r?.dividendYield ?? km?.dividendYield ?? null,
      dividendRate: p?.lastDiv ?? null,
      payoutRatio: r?.payoutRatio ?? null,
      targetHighPrice: pt?.targetHigh ?? null,
      targetLowPrice: pt?.targetLow ?? null,
      targetMeanPrice: pt?.targetConsensus ?? null,
      recommendationMean,
      recommendationKey: ratingText?.toLowerCase().replace(' ', '') ?? null,
      numberOfAnalystOpinions: null,
      analystBuy: null,
      analystHold: null,
      analystSell: null,
      sharesShort: null,
      shortRatio: null,
      shortPercentOfFloat: null,
      fiftyTwoWeekLow: q?.yearLow ?? null,
      fiftyTwoWeekHigh: q?.yearHigh ?? null,
      beta: p?.beta ?? null,
      marketCap: q?.marketCap ?? p?.mktCap ?? null,
      currentPrice: q?.price ?? null,
    };

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch fundamentals';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
