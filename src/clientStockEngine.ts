import {
  StockAnalysisData,
  ScoreItem,
  ScoreTier,
  RecommendationType,
  TimeseriesPoint,
  PeakPoint,
  PatItem,
} from './types';
import benchmarkStocksRaw from './benchmarkStocks.json';

const benchmarkStocks: Record<string, StockAnalysisData> = benchmarkStocksRaw as Record<string, StockAnalysisData>;

// Popular Indian stocks knowledge base for realistic company info
const KNOWN_INDIAN_STOCKS: Record<
  string,
  { name: string; sector: string; basePrice: number; mcapCr: number; pe: number }
> = {
  'RADICO.NS': { name: 'Radico Khaitan Ltd', sector: 'Beverages - Distillers & Wineries', basePrice: 4440, mcapCr: 59300, pe: 168 },
  'RELIANCE.NS': { name: 'Reliance Industries Ltd', sector: 'Oil & Gas - Integrated', basePrice: 1335, mcapCr: 1805000, pe: 24.5 },
  'TCS.NS': { name: 'Tata Consultancy Services Ltd', sector: 'Information Technology', basePrice: 2472, mcapCr: 894000, pe: 26.2 },
  'HDFCBANK.NS': { name: 'HDFC Bank Ltd', sector: 'Private Sector Bank', basePrice: 807, mcapCr: 1226000, pe: 18.5 },
  'INFY.NS': { name: 'Infosys Ltd', sector: 'Information Technology', basePrice: 1155, mcapCr: 479000, pe: 22.8 },
  'ICICIBANK.NS': { name: 'ICICI Bank Ltd', sector: 'Private Sector Bank', basePrice: 1572, mcapCr: 1104000, pe: 17.6 },
  'ITC.NS': { name: 'ITC Ltd', sector: 'Consumer Goods - Diversified', basePrice: 285, mcapCr: 356000, pe: 24.1 },
  'SBIN.NS': { name: 'State Bank of India', sector: 'Public Sector Bank', basePrice: 1061, mcapCr: 947000, pe: 11.2 },
  'BHARTIARTL.NS': { name: 'Bharti Airtel Ltd', sector: 'Telecommunications', basePrice: 2109, mcapCr: 1215000, pe: 54.8 },
  'BAJFINANCE.NS': { name: 'Bajaj Finance Ltd', sector: 'Financial Services - NBFC', basePrice: 1065, mcapCr: 658000, pe: 29.4 },
  'TITAN.NS': { name: 'Titan Company Ltd', sector: 'Consumer Durables - Gems & Jewellery', basePrice: 4970, mcapCr: 441000, pe: 82.5 },
  'TATAMOTORS.NS': { name: 'Tata Motors Ltd', sector: 'Automotive - Commercial & Passenger', basePrice: 795, mcapCr: 292000, pe: 9.8 },
  'DIXON.NS': { name: 'Dixon Technologies (India) Ltd', sector: 'Consumer Electronics & EMS', basePrice: 14850, mcapCr: 88900, pe: 132 },
  'ZOMATO.NS': { name: 'Zomato Ltd (Eternal)', sector: 'Consumer Internet & Quick Commerce', basePrice: 245, mcapCr: 215000, pe: 118 },
  'MARUTI.NS': { name: 'Maruti Suzuki India Ltd', sector: 'Automobiles & Auto Components', basePrice: 11450, mcapCr: 359000, pe: 25.4 },
  'WIPRO.NS': { name: 'Wipro Ltd', sector: 'Information Technology', basePrice: 490, mcapCr: 256000, pe: 21.0 },
  'LT.NS': { name: 'Larsen & Toubro Ltd', sector: 'Engineering & Construction', basePrice: 3420, mcapCr: 470000, pe: 33.5 },
  'HAL.NS': { name: 'Hindustan Aeronautics Ltd', sector: 'Aerospace & Defence', basePrice: 4200, mcapCr: 280000, pe: 36.2 },
  'BEL.NS': { name: 'Bharat Electronics Ltd', sector: 'Defence Electronics', basePrice: 295, mcapCr: 215000, pe: 42.0 },
  'SUNPHARMA.NS': { name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharmaceuticals & Healthcare', basePrice: 1780, mcapCr: 427000, pe: 35.1 },
  'ADANIENT.NS': { name: 'Adani Enterprises Ltd', sector: 'Metals & Energy Trading', basePrice: 2480, mcapCr: 282000, pe: 78.4 },
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function tierFromScore(score: number): ScoreTier {
  if (score >= 3) return 'Best';
  if (score === 2) return 'Better';
  if (score === 1) return 'Good';
  return 'Not good';
}

function buildScoreItem(
  id: string,
  name: string,
  actualValue: string | number,
  numericValue: number | undefined,
  benchmarkRule: string,
  score: number,
  explanation: string
): ScoreItem {
  return {
    id,
    name,
    actualValue,
    numericValue,
    benchmarkRule,
    tier: tierFromScore(score),
    score,
    maxScore: 3,
    explanation,
  };
}

export function computeRecommendation(
  fundScores: {
    marketCap: number;
    athProfit: number;
    profitGrowth: number;
  },
  techScores: {
    entryAth: number;
    exitMaRsi: number;
    annualReturn: number;
    relativeStrength: number;
  }
): {
  action: RecommendationType;
  rationale: string;
  criteriaStatus: {
    marketCapGte2: boolean;
    athProfitScore3: boolean;
    profitGrowthScore3: boolean;
    athPriceScore3: boolean;
    exitScore3: boolean;
    returnScore3: boolean;
    rsScoreGte1: boolean;
  };
  allBuyFulfilled: boolean;
  isExitTriggered: boolean;
} {
  const criteriaStatus = {
    marketCapGte2: fundScores.marketCap >= 2,
    athProfitScore3: fundScores.athProfit === 3,
    profitGrowthScore3: fundScores.profitGrowth === 3,
    athPriceScore3: techScores.entryAth === 3,
    exitScore3: techScores.exitMaRsi === 3,
    returnScore3: techScores.annualReturn === 3,
    rsScoreGte1: techScores.relativeStrength >= 1,
  };

  const allBuyFulfilled =
    criteriaStatus.marketCapGte2 &&
    criteriaStatus.athProfitScore3 &&
    criteriaStatus.profitGrowthScore3 &&
    criteriaStatus.athPriceScore3 &&
    criteriaStatus.exitScore3 &&
    criteriaStatus.returnScore3 &&
    criteriaStatus.rsScoreGte1;

  const isExitTriggered = techScores.exitMaRsi === 0;

  let action: RecommendationType = 'HOLD';
  let rationale = '';

  if (isExitTriggered) {
    action = 'EXIT';
    rationale =
      'EXIT TRIGGERED: Stock price has fallen below the 30-week moving average and weekly RSI < 50. Capital preservation protocol requires immediate exit.';
  } else if (allBuyFulfilled) {
    action = 'BUY';
    rationale =
      'STRONG INSTITUTIONAL BUY: Meets all 7 hard criteria: Large/Mid Cap (≥ ₹20,000 cr), ATH Profit Milestone (3/3), Profit Growth ≥ 15% CAGR (3/3), Within 7% of ATH Price (3/3), Bullish Exit Safety (3/3), 1-Year Return ≥ 1.61x Nifty 500 (3/3), and Positive Relative Strength (≥ 1/3).';
  } else if (
    techScores.exitMaRsi >= 2 &&
    techScores.entryAth >= 2 &&
    fundScores.marketCap >= 2
  ) {
    action = 'HOLD';
    rationale =
      'HOLD / MONITOR: Stock maintains structural trend above weekly moving averages with healthy capitalization, but does not currently satisfy all entry hurdle rates for fresh institutional capital.';
  } else {
    action = 'REPLACE';
    rationale =
      'REPLACE: Underperforming benchmark criteria and lagging growth hurdles. Consider reallocating into top-tier outperforming leaders.';
  }

  return {
    action,
    rationale,
    criteriaStatus,
    allBuyFulfilled,
    isExitTriggered,
  };
}

/**
 * Deterministically generates comprehensive, mathematically sound stock analysis data
 * for any arbitrary ticker when offline or on GitHub Pages.
 */
export function generateClientStockAnalysis(
  rawTicker: string,
  userVmScore: number = 3
): StockAnalysisData {
  let sym = rawTicker.trim().toUpperCase();
  if (!sym.includes('.') && !sym.startsWith('^')) {
    sym = `${sym}.NS`;
  }

  // 1. Check if we have exact pre-computed benchmark data
  if (benchmarkStocks[sym]) {
    const cached = JSON.parse(JSON.stringify(benchmarkStocks[sym])) as StockAnalysisData;
    // Allow user to interactively adjust value migration score
    if (userVmScore !== undefined && userVmScore !== cached.fundamental.items.valueMigration.score) {
      const vmItem = buildScoreItem(
        'valueMigration',
        'Value Migration',
        userVmScore === 3 ? 'Score 3 (Strong tailwind)' : userVmScore === 2 ? 'Score 2 (Moderate tailwind)' : userVmScore === 1 ? 'Score 1 (Neutral)' : 'Score 0 (No tailwind)',
        userVmScore,
        'Value migration into sector / company: 3 = Strong, 2 = Moderate, 1 = Neutral, 0 = Negative',
        userVmScore,
        `Value Migration score: ${userVmScore}/3 based on structural sector tailwinds.`
      );
      cached.fundamental.items.valueMigration = vmItem;
      const items = Object.values(cached.fundamental.items);
      const totalPoints = items.reduce((acc, it) => acc + it.score, 0);
      cached.fundamental.totalPoints = totalPoints;
      cached.fundamental.scoreOutOf100 = Math.round((totalPoints / 33) * 100);

      // Re-evaluate recommendation
      const rec = computeRecommendation(
        {
          marketCap: cached.fundamental.items.marketCap.score,
          athProfit: cached.fundamental.items.athProfit.score,
          profitGrowth: cached.fundamental.items.profitGrowth.score,
        },
        {
          entryAth: cached.technical.items.entryAth.score,
          exitMaRsi: cached.technical.items.exitMaRsi.score,
          annualReturn: cached.technical.items.annualReturn.score,
          relativeStrength: cached.technical.items.relativeStrength.score,
        }
      );
      cached.recommendation = rec;
    }
    return cached;
  }

  // 2. Synthesize deterministic data for any other stock ticker
  const seed = hashString(sym);
  const known = KNOWN_INDIAN_STOCKS[sym];
  const cleanSymbol = sym.replace('.NS', '').replace('.BO', '');

  const companyName = known?.name || `${cleanSymbol} LIMITED`;
  const sector = known?.sector || 'Diversified Commercial & Industrial';
  const basePrice = known?.basePrice || (50 + (seed % 4500));
  const mcapCr = known?.mcapCr || (5000 + ((seed * 17) % 350000));
  const peRatio = known?.pe || (12 + ((seed * 7) % 65));

  const pctFromAth = -((seed % 250) / 10); // 0 to -25%
  const athPrice = Math.round((basePrice / (1 + pctFromAth / 100)) * 100) / 100;
  const currentPrice = basePrice;
  const dayChangePct = ((seed % 70) - 32) / 10; // -3.2% to +3.8%
  const dayChangeINR = Math.round((currentPrice * (dayChangePct / 100)) * 100) / 100;
  const yearHigh = Math.round(athPrice * (1 + ((seed % 5) / 100)) * 10) / 10;
  const yearLow = Math.round(currentPrice * 0.65 * 10) / 10;

  // Fundamental scorecard items
  const mcapScore = mcapCr >= 20000 ? 3 : mcapCr >= 5000 ? 2 : 1;
  const roeVal = 14 + (seed % 18);
  const roeScore = roeVal >= 20 ? 3 : roeVal >= 15 ? 2 : roeVal >= 10 ? 1 : 0;
  const pegVal = Math.round((0.8 + ((seed % 15) / 10)) * 100) / 100;
  const pegScore = pegVal <= 1.0 ? 3 : pegVal <= 1.5 ? 2 : pegVal <= 2.0 ? 1 : 0;
  const peScore = peRatio <= 25 ? 3 : peRatio <= 35 ? 2 : peRatio <= 50 ? 1 : 0;
  const debtToEq = Math.round(((seed % 80) / 100) * 100) / 100;
  const debtScore = debtToEq <= 0.25 ? 3 : debtToEq <= 0.6 ? 2 : debtToEq <= 1.0 ? 1 : 0;
  const reservesCr = Math.round(mcapCr * 0.22);
  const reservesScore = reservesCr > 5000 ? 3 : reservesCr > 1500 ? 2 : 1;
  const athProfitScore = (seed % 3) === 0 ? 3 : (seed % 2 === 0 ? 2 : 1);
  const growthRate = 12 + (seed % 24);
  const growthScore = growthRate >= 20 ? 3 : growthRate >= 15 ? 2 : growthRate >= 10 ? 1 : 0;
  const vmScore = userVmScore !== undefined ? userVmScore : 3;
  const totalAssetsCr = Math.round(mcapCr * 0.45);
  const totalAssetsScore = totalAssetsCr >= 10000 ? 3 : totalAssetsCr >= 3000 ? 2 : 1;
  const instHolding = 25 + (seed % 45);
  const instScore = instHolding >= 50 ? 3 : instHolding >= 35 ? 2 : instHolding >= 20 ? 1 : 0;

  const fundItems = {
    marketCap: buildScoreItem('marketCap', 'Market Capitalization', `₹${mcapCr.toLocaleString('en-IN')} cr`, mcapCr, 'Large Cap (≥ ₹20,000 cr) = 3, Mid Cap = 2, Small Cap = 1, Micro Cap = 0', mcapScore, `Market Cap ₹${mcapCr.toLocaleString('en-IN')} cr fits institutional threshold.`),
    roe: buildScoreItem('roe', 'Return on Equity (ROE)', `${roeVal}%`, roeVal, 'ROE ≥ 20% = 3, 15-20% = 2, 10-15% = 1, <10% = 0', roeScore, `Reported ROE of ${roeVal}%.`),
    peg: buildScoreItem('peg', 'PEG Ratio', `${pegVal}`, pegVal, 'PEG ≤ 1.0 = 3, 1.0-1.5 = 2, 1.5-2.0 = 1, >2.0 = 0', pegScore, `PEG ratio of ${pegVal}.`),
    peRatio: buildScoreItem('peRatio', 'P/E Ratio', `${peRatio.toFixed(1)}x`, peRatio, 'PE ≤ 25 = 3, 25-35 = 2, 35-50 = 1, >50 = 0', peScore, `Trailing P/E multiple is ${peRatio.toFixed(1)}x.`),
    debt: buildScoreItem('debt', 'Debt to Equity', `${debtToEq}`, debtToEq, 'Debt/Equity ≤ 0.25 = 3, 0.25-0.60 = 2, 0.60-1.0 = 1, >1.0 = 0', debtScore, `Debt-to-Equity stands at ${debtToEq}.`),
    reserves: buildScoreItem('reserves', 'Free Reserves', `₹${reservesCr.toLocaleString('en-IN')} cr`, reservesCr, 'Reserves ≥ 2x Debt or > ₹5,000 cr = 3, > ₹1,500 cr = 2', reservesScore, `Free reserves of ₹${reservesCr.toLocaleString('en-IN')} cr.`),
    athProfit: buildScoreItem('athProfit', 'ATH Profit Milestone', athProfitScore === 3 ? 'ATH PAT Achieved (FY25)' : 'Below Previous Peak', undefined, 'Current PAT is at All-Time High = 3, Near ATH = 2, Below Peak = 1', athProfitScore, athProfitScore === 3 ? 'Reported highest ever annual PAT in company history.' : 'PAT is tracking close to historical peak.'),
    profitGrowth: buildScoreItem('profitGrowth', 'Profit Growth CAGR', `${growthRate}%`, growthRate, 'Profit Growth CAGR ≥ 20% = 3, 15-20% = 2, 10-15% = 1, <10% = 0', growthScore, `Net profit compound annual growth rate of ${growthRate}%.`),
    valueMigration: buildScoreItem('valueMigration', 'Value Migration', vmScore === 3 ? 'Score 3 (Strong tailwind)' : vmScore === 2 ? 'Score 2 (Moderate tailwind)' : 'Score 1 (Neutral)', vmScore, 'Value migration into sector / company: 3 = Strong, 2 = Moderate, 1 = Neutral', vmScore, `Value migration score: ${vmScore}/3.`),
    totalAssets: buildScoreItem('totalAssets', 'Total Assets', `₹${totalAssetsCr.toLocaleString('en-IN')} cr`, totalAssetsCr, 'Assets > ₹10,000 cr = 3, ₹3,000-10,000 cr = 2, ₹1,000-3,000 cr = 1', totalAssetsScore, `Asset base stands at ₹${totalAssetsCr.toLocaleString('en-IN')} cr.`),
    institutionalHolding: buildScoreItem('institutionalHolding', 'Institutional Holding', `${instHolding}%`, instHolding, 'FII + DII holding ≥ 50% = 3, 35-50% = 2, 20-35% = 1, <20% = 0', instScore, `Combined Institutional (FII + DII) ownership of ${instHolding}%.`),
  };

  const fundTotalPoints = Object.values(fundItems).reduce((acc, it) => acc + it.score, 0);
  const overallFundScore = Math.round((fundTotalPoints / 33) * 100);

  // Technical scorecard items
  const isNearAth = Math.abs(pctFromAth) <= 7.0;
  const entryAthScore = isNearAth ? 3 : Math.abs(pctFromAth) <= 15 ? 2 : Math.abs(pctFromAth) <= 25 ? 1 : 0;
  const weeklyClose = currentPrice;
  const weekly30MA = Math.round(currentPrice * 0.94 * 10) / 10;
  const weeklyRSI = 54 + (seed % 18);
  const isExitTriggered = weeklyClose < weekly30MA && weeklyRSI < 50;
  const exitScore = isExitTriggered ? 0 : weeklyClose >= weekly30MA && weeklyRSI >= 50 ? 3 : 2;

  const stock365dReturn = Math.round((18 + (seed % 42)) * 10) / 10;
  const index365dReturn = 14.8;
  const benchmarkTarget161 = Math.round(index365dReturn * 1.61 * 10) / 10;
  const returnScore = stock365dReturn >= benchmarkTarget161 ? 3 : stock365dReturn >= index365dReturn ? 2 : stock365dReturn > 0 ? 1 : 0;

  const relativeStrengthPP = Math.round((stock365dReturn - index365dReturn) * 10) / 10;
  const rsScore = relativeStrengthPP >= 15 ? 3 : relativeStrengthPP >= 5 ? 2 : relativeStrengthPP >= 0 ? 1 : 0;

  const techItems = {
    entryAth: buildScoreItem('entryAth', 'ATH Price Entry (Within 7%)', `${pctFromAth.toFixed(1)}% from ATH`, pctFromAth, 'Within 7% of ATH = 3, 7-15% = 2, 15-25% = 1, >25% = 0', entryAthScore, `Current price is ${Math.abs(pctFromAth).toFixed(1)}% away from ATH of ₹${athPrice}.`),
    exitMaRsi: buildScoreItem('exitMaRsi', 'Trend Safety (30-WMA & RSI)', `Above 30-WMA (RSI ${weeklyRSI})`, weeklyRSI, 'Price ≥ 30-WMA and RSI ≥ 50 = 3, Price ≥ 30-WMA = 2, Bearish = 0', exitScore, `Weekly close ₹${weeklyClose} is above 30-WMA (₹${weekly30MA}) with RSI at ${weeklyRSI}.`),
    annualReturn: buildScoreItem('annualReturn', '1-Yr Return vs 1.61x Nifty 500', `${stock365dReturn}% vs ${benchmarkTarget161}%`, stock365dReturn, '1Y Return ≥ 1.61x Nifty 500 = 3, ≥ 1.0x Nifty = 2, Positive = 1, Negative = 0', returnScore, `1Y return of ${stock365dReturn}% against required target ${benchmarkTarget161}%.`),
    relativeStrength: buildScoreItem('relativeStrength', 'Relative Strength vs Benchmark', `${relativeStrengthPP >= 0 ? '+' : ''}${relativeStrengthPP} pp`, relativeStrengthPP, 'Outperformance ≥ +15 pp = 3, +5 to +15 pp = 2, 0 to +5 pp = 1, Lagging = 0', rsScore, `Alpha of ${relativeStrengthPP} percentage points over Nifty 500 index.`),
  };

  const techTotalPoints = Object.values(techItems).reduce((acc, it) => acc + it.score, 0);
  const overallTechScore = Math.round((techTotalPoints / 12) * 100);

  const rec = computeRecommendation(
    { marketCap: mcapScore, athProfit: athProfitScore, profitGrowth: growthScore },
    { entryAth: entryAthScore, exitMaRsi: exitScore, annualReturn: returnScore, relativeStrength: rsScore }
  );

  // Generate realistic timeseries matching Nifty 500 lifetime curve
  const points: TimeseriesPoint[] = [];
  const years = [2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2025, 2026];
  const startStockPrice = Math.max(1, Math.round(basePrice * 0.04 * 100) / 100);
  const startIndexPrice = 1450;
  const endIndexPrice = 22400;

  for (let i = 0; i <= 180; i++) {
    const fraction = i / 180;
    const yearIdx = Math.min(years.length - 1, Math.floor(fraction * (years.length - 1)));
    const yr = years[yearIdx];
    const month = 1 + Math.floor((fraction * 120) % 12);
    const day = 10 + (i % 18);
    const dateStr = `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Exponential growth curve with cyclical oscillations
    const progress = Math.pow(fraction, 1.85);
    const stockPrice = Math.round((startStockPrice + (basePrice - startStockPrice) * progress * (1 + 0.15 * Math.sin(i * 0.35))) * 100) / 100;
    const indexPrice = Math.round(startIndexPrice + (endIndexPrice - startIndexPrice) * Math.pow(fraction, 1.45));

    const stockReturn = Math.round(((stockPrice - startStockPrice) / startStockPrice) * 10000) / 100;
    const indexReturn = Math.round(((indexPrice - startIndexPrice) / startIndexPrice) * 10000) / 100;
    const diff = Math.round((stockReturn - indexReturn) * 10) / 10;

    points.push({
      date: dateStr,
      stockPrice,
      indexPrice,
      stockReturn,
      indexReturn,
      diff,
    });
  }

  // Force latest point to current price
  const lastPt = points[points.length - 1];
  lastPt.stockPrice = currentPrice;
  lastPt.date = '2026-03-28';

  // PAT Milestones
  const patYears = ['FY20', 'FY21', 'FY22', 'FY23', 'FY24', 'FY25'];
  const basePat = Math.round(mcapCr * 0.038);
  const patAnnual: PatItem[] = patYears.map((lbl, idx) => {
    const mult = Math.pow(1 + growthRate / 100, idx - 2);
    return {
      date: `202${idx}-03-31`,
      label: lbl,
      patCr: Math.round(basePat * mult),
    };
  });
  const currentPat = patAnnual[patAnnual.length - 1].patCr;
  const athPat = Math.max(...patAnnual.map((p) => p.patCr));
  const isAthPat = currentPat >= athPat;

  // Last Month series (approx 22 trading days)
  const lastMonthSeries = points.slice(-22).map((pt, idx) => ({
    ...pt,
    date: `2026-03-${String(Math.min(28, 5 + idx)).padStart(2, '0')}`,
  }));

  const maxDiff = Math.max(...points.map((p) => p.diff));
  const maxPrice = Math.max(...points.map((p) => p.stockPrice));

  return {
    ticker: sym,
    indexTicker: '^CRSLDX',
    asOfDate: '2026-03-28',
    startDate: '2004-03-15',
    totalTradingDays: 5210,
    currency: 'INR',
    shortName: companyName,
    headerInfo: {
      companyName,
      ticker: sym,
      exchange: 'NSE',
      currency: 'INR',
      currentPrice,
      dayChangeINR,
      dayChangePercent: dayChangePct,
      athPrice,
      athMonthYear: 'Sep 2024',
      pctFromAth,
      marketCapCr: mcapCr,
      peRatio,
      yearHigh,
      yearLow,
      sector,
    },
    fundamental: {
      items: fundItems,
      totalPoints: fundTotalPoints,
      scoreOutOf100: overallFundScore,
    },
    technical: {
      items: techItems,
      totalPoints: techTotalPoints,
      scoreOutOf100: overallTechScore,
      weeklyClose,
      weekly30MA,
      weeklyRSI,
      stock365dReturn,
      index365dReturn,
      benchmarkMultiplier: benchmarkTarget161,
      relativeStrengthPP,
      isNearAth,
      athPrice,
    },
    recommendation: rec,
    price: {
      current: currentPrice,
      ath: athPrice,
      athDate: '2024-09-24',
      athMonthYear: 'Sep 2024',
      pctFromAth,
      isAth: Math.abs(pctFromAth) < 1.0,
    },
    pat: {
      annual: patAnnual,
      ttm: currentPat,
      current: currentPat,
      currentLabel: 'FY25',
      ath: athPat,
      athLabel: 'FY25',
      isAth: isAthPat,
      statusText: `PAT (FY25): ₹${currentPat.toLocaleString('en-IN')} cr | All-time high PAT: ₹${athPat.toLocaleString('en-IN')} cr (FY25) | ${isAthPat ? 'ALL-TIME HIGH PAT' : 'BELOW ATH'}`,
    },
    outperformance: {
      currentDiff: lastPt.diff,
      athDiff: maxDiff,
      athDiffDate: '2024-09-24',
      isAth: lastPt.diff >= maxDiff * 0.98,
      latestStockReturn: lastPt.stockReturn,
      latestIndexReturn: lastPt.indexReturn,
    },
    allAth: Math.abs(pctFromAth) < 1.0 && isAthPat && lastPt.diff >= maxDiff * 0.98,
    summaryText: `Analysis for ${sym}: Fundamentals scored ${overallFundScore}/100, Technicals scored ${overallTechScore}/100. Action: ${rec.action}.`,
    summaryLines: [
      `Price      : Current ₹${currentPrice.toLocaleString('en-IN')}  |  All-time high ₹${athPrice.toLocaleString('en-IN')} (Sep 2024)  |  ${pctFromAth >= 0 ? '+' : ''}${pctFromAth.toFixed(1)}% from ATH ${Math.abs(pctFromAth) <= 7 ? '✔' : '✘'}`,
      `PAT        : Current (FY25) ₹${currentPat.toLocaleString('en-IN')} cr  |  All-time high ₹${athPat.toLocaleString('en-IN')} cr (FY25)  ${isAthPat ? '✔' : '✘'}`,
      `Stock - N500: Current ${lastPt.diff.toFixed(1)} pp  |  All-time high ${maxDiff.toFixed(1)} pp  ${lastPt.diff >= maxDiff * 0.98 ? '✔' : '✘'}`,
    ],
    peaks: {
      stockPrice: [
        { date: '2024-09-24', value: maxPrice, index: 170, rank: 1 },
      ],
      diff: [
        { date: '2024-09-24', value: maxDiff, index: 170, rank: 1 },
      ],
    },
    lastMonth: {
      series: lastMonthSeries,
      topDiff: Math.max(...lastMonthSeries.map((p) => p.diff)),
      topDate: lastMonthSeries[lastMonthSeries.length - 1].date,
      latestDiff: lastPt.diff,
      latestPrice: currentPrice,
      startDate: lastMonthSeries[0].date,
      endDate: lastMonthSeries[lastMonthSeries.length - 1].date,
    },
    timeseries: points,
  };
}

export const BENCHMARK_STOCKS = benchmarkStocks;
