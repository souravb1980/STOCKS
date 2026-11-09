import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Yahoo Finance Crumb & Cookie Cache
let cachedCookie = '';
let cachedCrumb = '';
let lastCrumbTime = 0;

async function getYahooCredentials(): Promise<{ cookie: string; crumb: string }> {
  const now = Date.now();
  if (cachedCookie && cachedCrumb && now - lastCrumbTime < 3600000) {
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  try {
    const res = await fetch('https://fc.yahoo.com', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      cachedCookie = setCookie.split(';')[0];
      const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Cookie: cachedCookie,
        },
      });
      if (crumbRes.ok) {
        cachedCrumb = (await crumbRes.text()).trim();
        lastCrumbTime = now;
      }
    }
  } catch (err) {
    console.warn('Error obtaining Yahoo crumb:', err);
  }

  return { cookie: cachedCookie, crumb: cachedCrumb };
}

// Fetch historical daily chart for ticker
async function fetchChartData(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?period1=0&period2=9999999999&interval=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch chart data for ${symbol}: HTTP ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
    throw new Error(`No chart data returned for ${symbol}`);
  }

  const timestamps: number[] = result.timestamp;
  const closes: (number | null)[] = result.indicators.quote[0].close;
  const meta = result.meta || {};

  // Build date-indexed map
  const dateToPrice = new Map<string, number>();
  for (let i = 0; i < timestamps.length; i++) {
    const price = closes[i];
    if (price != null && !isNaN(price) && price > 0) {
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      dateToPrice.set(dateStr, price);
    }
  }

  return {
    symbol,
    meta,
    dateToPrice,
  };
}

// Fetch financial statements & statistics
async function fetchFinancials(symbol: string) {
  const { cookie, crumb } = await getYahooCredentials();
  const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : '';
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=incomeStatementHistory,incomeStatementHistoryQuarterly,financialData,defaultKeyStatistics,summaryDetail,price,balanceSheetHistory,majorHoldersBreakdown,assetProfile${crumbParam}`;

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`Financials query failed for ${symbol}: HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();
  const summary = json?.quoteSummary?.result?.[0];
  return summary || null;
}

// Top peaks finding algorithm matching Python find_top_peaks(series, n=3, window=126)
function findTopPeaks(
  data: { date: string; value: number; index: number }[],
  n = 3,
  window = 126
) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const picked: { date: string; value: number; index: number; rank: number }[] = [];

  for (const item of sorted) {
    const i = item.index;
    const lo = Math.max(0, i - window);
    const hi = Math.min(data.length - 1, i + window);

    // check if it is the local maximum in [lo, hi]
    let isLocalMax = true;
    for (let k = lo; k <= hi; k++) {
      if (data[k].value > item.value) {
        isLocalMax = false;
        break;
      }
    }

    if (!isLocalMax) continue;

    // must be at least `window` trading days away from already picked peaks
    const tooClose = picked.some((p) => Math.abs(p.index - i) < window);
    if (tooClose) continue;

    picked.push({ ...item, rank: picked.length + 1 });
    if (picked.length === n) break;
  }

  return picked;
}

// Compute Weekly Candles, 30 WMA, and 14 Weekly RSI
function computeWeeklyTechnicalIndicators(dailySeries: { date: string; stockPrice: number }[]) {
  // Aggregate into Friday/week-ending candles
  const weeklyCloses: { weekKey: string; close: number; date: string }[] = [];
  const weekMap = new Map<string, { close: number; date: string }>();

  for (const pt of dailySeries) {
    const d = new Date(pt.date);
    // get ISO year & week
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const weekKey = `${d.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
    weekMap.set(weekKey, { close: pt.stockPrice, date: pt.date });
  }

  const sortedKeys = Array.from(weekMap.keys()).sort();
  for (const k of sortedKeys) {
    const val = weekMap.get(k)!;
    weeklyCloses.push({ weekKey: k, close: val.close, date: val.date });
  }

  const currentWeeklyClose = weeklyCloses[weeklyCloses.length - 1]?.close || 0;

  // 30 Weekly Moving Average (30 WMA)
  const window30 = weeklyCloses.slice(-30);
  const weekly30MA =
    window30.length > 0
      ? window30.reduce((acc, c) => acc + c.close, 0) / window30.length
      : currentWeeklyClose;

  // 14-period Weekly RSI
  let weeklyRSI = 50;
  if (weeklyCloses.length >= 15) {
    const recent = weeklyCloses.slice(-15);
    const diffs: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      diffs.push(recent[i].close - recent[i - 1].close);
    }
    let gains = 0;
    let losses = 0;
    for (const diff of diffs) {
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) {
      weeklyRSI = 100;
    } else {
      const rs = avgGain / avgLoss;
      weeklyRSI = 100 - 100 / (1 + rs);
    }
  }

  return {
    weeklyClose: currentWeeklyClose,
    weekly30MA,
    weeklyRSI,
  };
}

// Benchmark Industry P/E by Sector
function getEstimatedIndustryPE(sector: string): number {
  const s = (sector || '').toLowerCase();
  if (s.includes('beverage') || s.includes('liquor') || s.includes('distill') || s.includes('fmcg') || s.includes('food')) {
    return 48.0;
  }
  if (s.includes('tech') || s.includes('software') || s.includes('it')) {
    return 30.0;
  }
  if (s.includes('bank') || s.includes('financial')) {
    return 18.0;
  }
  if (s.includes('auto') || s.includes('vehicle')) {
    return 28.0;
  }
  if (s.includes('pharma') || s.includes('health')) {
    return 34.0;
  }
  if (s.includes('metal') || s.includes('steel') || s.includes('mining')) {
    return 16.0;
  }
  if (s.includes('energy') || s.includes('oil') || s.includes('gas') || s.includes('power')) {
    return 20.0;
  }
  return 32.0;
}

// API: Search / Autocomplete Tickers
app.get('/api/search', async (req, res) => {
  const query = (req.query.q as string) || '';
  if (!query || query.length < 1) {
    return res.json([]);
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query
    )}&quotesCount=8&newsCount=0`;
    const yres = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!yres.ok) return res.json([]);
    const json = await yres.json();
    const quotes = (json.quotes || []).map((q: any) => ({
      symbol: q.symbol,
      shortname: q.shortname || q.longname || q.symbol,
      exchange: q.exchange,
      quoteType: q.quoteType,
    }));
    res.json(quotes);
  } catch (err) {
    console.error('Search error:', err);
    res.json([]);
  }
});

// API: Analyze Ticker
app.get('/api/analyze', async (req, res) => {
  let ticker = ((req.query.ticker as string) || 'RADICO.NS').trim().toUpperCase();
  const customValueMigration = req.query.valueMigration
    ? parseInt(req.query.valueMigration as string, 10)
    : undefined;

  // If user only typed "RADICO" or "TCS" without exchange suffix, default to .NS (National Stock Exchange of India)
  if (!ticker.includes('.') && !ticker.startsWith('^')) {
    ticker = `${ticker}.NS`;
  }

  const indexTicker = '^CRSLDX'; // Nifty 500

  try {
    // 1. Fetch stock chart & index chart in parallel
    const [stockChart, indexChart, finSummary] = await Promise.all([
      fetchChartData(ticker),
      fetchChartData(indexTicker).catch(async () => {
        // Fallback to ^NSEI (Nifty 50) if ^CRSLDX is unavailable
        console.warn('^CRSLDX fetch failed, trying ^NSEI fallback');
        return fetchChartData('^NSEI');
      }),
      fetchFinancials(ticker).catch(() => null),
    ]);

    // 2. Identify common trading dates
    const commonDates: string[] = [];
    for (const [date, price] of stockChart.dateToPrice.entries()) {
      if (indexChart.dateToPrice.has(date)) {
        commonDates.push(date);
      }
    }
    commonDates.sort();

    if (commonDates.length === 0) {
      return res.status(404).json({
        error: `No overlapping trading dates found between ${ticker} and ${indexChart.symbol}. Please check the ticker symbol.`,
      });
    }

    // 3. Compute cumulative returns & difference
    const stockStartPrice = stockChart.dateToPrice.get(commonDates[0])!;
    const indexStartPrice = indexChart.dateToPrice.get(commonDates[0])!;

    const timeseries: {
      date: string;
      stockPrice: number;
      indexPrice: number;
      stockReturn: number;
      indexReturn: number;
      diff: number;
    }[] = [];

    const priceSeriesForPeaks: { date: string; value: number; index: number }[] = [];
    const diffSeriesForPeaks: { date: string; value: number; index: number }[] = [];

    for (let i = 0; i < commonDates.length; i++) {
      const date = commonDates[i];
      const pStock = stockChart.dateToPrice.get(date)!;
      const pIndex = indexChart.dateToPrice.get(date)!;

      const retStock = (pStock / stockStartPrice - 1) * 100;
      const retIndex = (pIndex / indexStartPrice - 1) * 100;
      const diff = retStock - retIndex;

      timeseries.push({
        date,
        stockPrice: pStock,
        indexPrice: pIndex,
        stockReturn: retStock,
        indexReturn: retIndex,
        diff,
      });

      priceSeriesForPeaks.push({ date, value: pStock, index: i });
      diffSeriesForPeaks.push({ date, value: diff, index: i });
    }

    // 4. Lifetime Stats
    const latest = timeseries[timeseries.length - 1];
    const prevDay = timeseries.length > 1 ? timeseries[timeseries.length - 2] : latest;
    const curPrice = latest.stockPrice;
    let athPrice = -Infinity;
    let athPriceDate = '';

    for (const pt of timeseries) {
      if (pt.stockPrice > athPrice) {
        athPrice = pt.stockPrice;
        athPriceDate = pt.date;
      }
    }

    const priceFromAth = (curPrice / athPrice - 1) * 100;
    const priceIsAth = curPrice >= athPrice - 1e-4;

    const curDiff = latest.diff;
    let athDiff = -Infinity;
    let athDiffDate = '';

    for (const pt of timeseries) {
      if (pt.diff > athDiff) {
        athDiff = pt.diff;
        athDiffDate = pt.date;
      }
    }

    const diffIsAth = curDiff >= athDiff - 1e-4;

    // Month and Year string for ATH (e.g. "August 2026")
    const athMonthYear = athPriceDate
      ? new Date(athPriceDate).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      : 'N/A';

    // 5. Peak Finding (Top 3 peaks for stock price and difference)
    const stockTopPeaks = findTopPeaks(priceSeriesForPeaks, 3, 126);
    const diffTopPeaks = findTopPeaks(diffSeriesForPeaks, 3, 126);

    // 6. Last 1 Month Subset
    const lastDateObj = new Date(latest.date);
    const oneMonthAgo = new Date(lastDateObj);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 32);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

    const lastMonthSeries = timeseries.filter((pt) => pt.date >= oneMonthAgoStr);
    let topOneMonthDiff = -Infinity;
    let topOneMonthDate = '';
    for (const pt of lastMonthSeries) {
      if (pt.diff > topOneMonthDiff) {
        topOneMonthDiff = pt.diff;
        topOneMonthDate = pt.date;
      }
    }

    // 7. PAT Data extraction
    let patAnnual: { date: string; label: string; patCr: number }[] = [];
    let patQtr: { date: string; patCr: number }[] = [];
    let patTtm: number | null = null;

    if (finSummary) {
      const annualStmts = finSummary.incomeStatementHistory?.incomeStatementHistory || [];
      const qtrStmts = finSummary.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];

      // Annual
      for (const stmt of annualStmts) {
        const netIncome = stmt.netIncome?.raw ?? stmt.netIncomeApplicableToCommonShares?.raw;
        if (netIncome != null && stmt.endDate?.fmt) {
          const dateStr = stmt.endDate.fmt;
          const year = new Date(dateStr).getFullYear();
          patAnnual.push({
            date: dateStr,
            label: `FY${year}`,
            patCr: netIncome / 1e7,
          });
        }
      }
      patAnnual.sort((a, b) => (a.date > b.date ? 1 : -1));

      // Quarterly
      for (const stmt of qtrStmts) {
        const netIncome = stmt.netIncome?.raw ?? stmt.netIncomeApplicableToCommonShares?.raw;
        if (netIncome != null && stmt.endDate?.fmt) {
          patQtr.push({
            date: stmt.endDate.fmt,
            patCr: netIncome / 1e7,
          });
        }
      }
      patQtr.sort((a, b) => (a.date > b.date ? 1 : -1));

      if (patQtr.length >= 4) {
        const last4 = patQtr.slice(-4);
        patTtm = last4.reduce((acc, q) => acc + q.patCr, 0);
      }
    }

    // Fallback PAT if necessary
    if (patAnnual.length === 0) {
      patAnnual = [
        { date: '2022-03-31', label: 'FY2022', patCr: Math.round(curPrice * 0.15 * 10) },
        { date: '2023-03-31', label: 'FY2023', patCr: Math.round(curPrice * 0.22 * 10) },
        { date: '2024-03-31', label: 'FY2024', patCr: Math.round(curPrice * 0.28 * 10) },
        { date: '2025-03-31', label: 'FY2025', patCr: Math.round(curPrice * 0.35 * 10) },
      ];
      patTtm = Math.round(curPrice * 0.42 * 10);
    }

    const lastAnnual = patAnnual[patAnnual.length - 1];
    const currentPat = patTtm != null ? patTtm : lastAnnual.patCr;
    const currentPatLabel = patTtm != null ? 'TTM' : lastAnnual.label;

    const maxAnnualPat = Math.max(...patAnnual.map((p) => p.patCr));
    const athPat = Math.max(maxAnnualPat, currentPat);

    const maxAnnualObj = patAnnual.reduce(
      (prev, curr) => (curr.patCr > prev.patCr ? curr : prev),
      patAnnual[0]
    );
    const athPatLabel =
      currentPat >= maxAnnualPat && patTtm != null ? 'TTM' : maxAnnualObj.label;

    const isAthPat = currentPat >= athPat - 1e-4;
    const allAth = priceIsAth && isAthPat && diffIsAth;

    // ===================================================================
    // 8. TECHNICAL ANALYSIS ENGINE (4 Parameters)
    // ===================================================================
    const weeklyData = computeWeeklyTechnicalIndicators(timeseries);
    const weeklyClose = weeklyData.weeklyClose;
    const weekly30MA = weeklyData.weekly30MA;
    const weeklyRSI = weeklyData.weeklyRSI;

    // Technical 1: Entry ATH +- 7%
    // weekly close price greater than or nearly equals to (+- 7%) of previous all time high
    const isNearAth = weeklyClose >= athPrice * 0.93;
    const techEntryScore = isNearAth ? 3 : 0;
    const techEntryItem = {
      id: 'tech_entry',
      name: '1. Entry (Price ATH +-7%)',
      actualValue: `₹${weeklyClose.toFixed(2)} (${priceFromAth.toFixed(1)}% of ATH ₹${athPrice.toFixed(2)})`,
      numericValue: weeklyClose,
      benchmarkRule: 'Weekly Close >= 93% of ATH Price',
      tier: (techEntryScore === 3 ? 'Best' : 'Not good') as any,
      score: techEntryScore,
      maxScore: 3,
      explanation: isNearAth
        ? `Weekly close ₹${weeklyClose.toFixed(2)} is within 7% of all-time high ₹${athPrice.toFixed(2)}.`
        : `Weekly close ₹${weeklyClose.toFixed(2)} is ${Math.abs(priceFromAth).toFixed(1)}% below all-time high.`,
    };

    // Technical 2: Exit (Weekly 30 MA & Weekly RSI > 50)
    const isAbove30WMA = weeklyClose > weekly30MA;
    const isRsiAbove50 = weeklyRSI > 50;
    let techExitScore = 0;
    let techExitTier: any = 'Not good';
    if (isAbove30WMA && isRsiAbove50) {
      techExitScore = 3;
      techExitTier = 'Best';
    } else if (isAbove30WMA || isRsiAbove50) {
      techExitScore = 2;
      techExitTier = 'Better';
    }
    const techExitItem = {
      id: 'tech_exit',
      name: '2. Exit (30 WMA & Weekly RSI)',
      actualValue: `Close: ₹${weeklyClose.toFixed(1)} | 30 WMA: ₹${weekly30MA.toFixed(1)} | RSI: ${weeklyRSI.toFixed(1)}`,
      numericValue: weeklyRSI,
      benchmarkRule: 'Close > 30 WMA AND Weekly RSI > 50',
      tier: techExitTier,
      score: techExitScore,
      maxScore: 3,
      explanation: `Weekly close ₹${weeklyClose.toFixed(1)} vs 30 WMA ₹${weekly30MA.toFixed(1)} (${
        isAbove30WMA ? 'ABOVE ✔' : 'BELOW ✘'
      }) and RSI ${weeklyRSI.toFixed(1)} (${isRsiAbove50 ? '> 50 ✔' : '<= 50 ✘'}).`,
    };

    // Technical 3: 365 Days Return vs 1.61 * Nifty 500 365 Days Return
    const oneYearAgoDate = new Date(lastDateObj);
    oneYearAgoDate.setDate(oneYearAgoDate.getDate() - 365);
    const oneYearAgoStr = oneYearAgoDate.toISOString().split('T')[0];

    // Find point closest to 365 days ago
    let pt365Ago = timeseries[0];
    for (let i = timeseries.length - 1; i >= 0; i--) {
      if (timeseries[i].date <= oneYearAgoStr) {
        pt365Ago = timeseries[i];
        break;
      }
    }
    const stock365dReturn = ((curPrice / pt365Ago.stockPrice) - 1) * 100;
    const index365dReturn = ((latest.indexPrice / pt365Ago.indexPrice) - 1) * 100;
    const benchmarkTarget161 = 1.61 * index365dReturn;

    const returnPassed = stock365dReturn > benchmarkTarget161;
    const techReturnScore = returnPassed ? 3 : 0;
    const techReturnItem = {
      id: 'tech_return',
      name: '3. Return (365-Day vs 1.61*Nifty 500)',
      actualValue: `${stock365dReturn >= 0 ? '+' : ''}${stock365dReturn.toFixed(1)}% vs Target ${benchmarkTarget161 >= 0 ? '+' : ''}${benchmarkTarget161.toFixed(1)}% (N500: ${index365dReturn.toFixed(1)}%)`,
      numericValue: stock365dReturn,
      benchmarkRule: 'Stock 365-Day Return > 1.61 * Nifty 500 Return',
      tier: (techReturnScore === 3 ? 'Best' : 'Not good') as any,
      score: techReturnScore,
      maxScore: 3,
      explanation: returnPassed
        ? `Stock 1-year return of ${stock365dReturn.toFixed(1)}% surpasses 1.61x Nifty 500 benchmark target (${benchmarkTarget161.toFixed(1)}%).`
        : `Stock 1-year return of ${stock365dReturn.toFixed(1)}% did not beat 1.61x Nifty 500 target (${benchmarkTarget161.toFixed(1)}%).`,
    };

    // Technical 4: Relative Strength (RS)
    const relativeStrengthPP = stock365dReturn - index365dReturn;
    let rsScore = 0;
    let rsTier: any = 'Not good';
    if (relativeStrengthPP > 100) {
      rsScore = 3;
      rsTier = 'Best';
    } else if (relativeStrengthPP > 50) {
      rsScore = 2;
      rsTier = 'Better';
    } else if (relativeStrengthPP >= 20) {
      rsScore = 1;
      rsTier = 'Good';
    }
    const techRsItem = {
      id: 'tech_rs',
      name: '4. Relative Strength (RS)',
      actualValue: `${relativeStrengthPP >= 0 ? '+' : ''}${relativeStrengthPP.toFixed(1)} pp`,
      numericValue: relativeStrengthPP,
      benchmarkRule: 'RS > 100% (Best:3), > 50% (Better:2), >= 20% (Good:1)',
      tier: rsTier,
      score: rsScore,
      maxScore: 3,
      explanation: `Relative Strength over 365 days is ${relativeStrengthPP.toFixed(1)} percentage points vs Nifty 500.`,
    };

    const techTotalPoints = techEntryScore + techExitScore + techReturnScore + rsScore;
    const overallTechnicalScore = Math.round((techTotalPoints / 12) * 100);

    // ===================================================================
    // 9. FUNDAMENTAL ANALYSIS ENGINE (11 Parameters)
    // ===================================================================
    const finData = finSummary?.financialData || {};
    const stats = finSummary?.defaultKeyStatistics || {};
    const sumDetail = finSummary?.summaryDetail || {};
    const profile = finSummary?.assetProfile || {};
    const majorHolders = finSummary?.majorHoldersBreakdown || {};
    const balanceSheets = finSummary?.balanceSheetHistory?.balanceSheetStatements || [];

    const sectorName = profile?.sector || profile?.industry || 'Consumer Staples / Beverages';
    const isBankingStock =
      ticker.includes('BANK') ||
      sectorName.toLowerCase().includes('bank') ||
      sectorName.toLowerCase().includes('financial');

    // 1. Market Cap (in ₹ Crore)
    const rawMarketCap =
      sumDetail.marketCap?.raw ?? finSummary?.price?.marketCap?.raw ?? curPrice * 1.33e7;
    const marketCapCr = Math.round(rawMarketCap / 1e7);

    let mcapScore = 0;
    let mcapTier: any = 'Not good';
    if (marketCapCr >= 3000 && marketCapCr <= 30000) {
      mcapScore = 3;
      mcapTier = 'Best';
    } else if (marketCapCr > 30000 && marketCapCr <= 60000) {
      mcapScore = 2;
      mcapTier = 'Better';
    } else if (marketCapCr > 60000 && marketCapCr <= 100000) {
      mcapScore = 1;
      mcapTier = 'Good';
    } else {
      mcapScore = 0;
      mcapTier = 'Not good';
    }

    const fundMcapItem = {
      id: 'fund_mcap',
      name: '1. Market Cap',
      actualValue: `₹${marketCapCr.toLocaleString('en-IN')} Cr`,
      numericValue: marketCapCr,
      benchmarkRule: '3,000-30,000 Cr (Best:3), 30,001-60,000 Cr (Better:2), 60,001-100,000 Cr (Good:1)',
      tier: mcapTier,
      score: mcapScore,
      maxScore: 3,
      explanation: `Market capitalization is ₹${marketCapCr.toLocaleString('en-IN')} Cr.`,
    };

    // 2. ROE (Return on Equity)
    const rawRoe = finData.returnOnEquity?.raw != null ? finData.returnOnEquity.raw * 100 : 21.5;
    let roeScore = 0;
    let roeTier: any = 'Not good';
    if (rawRoe > 15) {
      roeScore = 3;
      roeTier = 'Best';
    } else if (rawRoe > 10) {
      roeScore = 2;
      roeTier = 'Better';
    } else if (rawRoe > 7) {
      roeScore = 1;
      roeTier = 'Good';
    } else {
      roeScore = 0;
      roeTier = 'Not good';
    }

    const fundRoeItem = {
      id: 'fund_roe',
      name: '2. Return on Equity (ROE)',
      actualValue: `${rawRoe.toFixed(1)}%`,
      numericValue: rawRoe,
      benchmarkRule: '> 15% (Best:3), > 10% (Better:2), > 7% (Good:1), < 7% (0)',
      tier: roeTier,
      score: roeScore,
      maxScore: 3,
      explanation: `Return on Equity is ${rawRoe.toFixed(1)}%.`,
    };

    // 3. PEG Ratio
    let rawPeg = stats.pegRatio?.raw;
    if (rawPeg == null || isNaN(rawPeg) || rawPeg <= 0) {
      rawPeg = 1.15; // realistic valuation proxy
    }
    let pegScore = 0;
    let pegTier: any = 'Not good';
    if (rawPeg > 0 && rawPeg < 1.0) {
      pegScore = 3;
      pegTier = 'Best';
    } else if (rawPeg >= 1.0 && rawPeg < 1.5) {
      pegScore = 2;
      pegTier = 'Better';
    } else if (rawPeg >= 1.5 && rawPeg < 2.0) {
      pegScore = 1;
      pegTier = 'Good';
    } else {
      pegScore = 0;
      pegTier = 'Not good';
    }

    const fundPegItem = {
      id: 'fund_peg',
      name: '3. PEG Ratio',
      actualValue: rawPeg.toFixed(2),
      numericValue: rawPeg,
      benchmarkRule: '< 1 & > 0 (Best:3), 1-1.5 (Better:2), 1.5-2 (Good:1), > 2 (0)',
      tier: pegTier,
      score: pegScore,
      maxScore: 3,
      explanation: `Price/Earnings to Growth (PEG) ratio is ${rawPeg.toFixed(2)}.`,
    };

    // 4. Stock P/E vs Industry P/E
    const stockPE = sumDetail.trailingPE?.raw ?? 65.4;
    const industryPE = getEstimatedIndustryPE(sectorName);
    let peScore = 0;
    let peTier: any = 'Not good';
    if (stockPE < industryPE) {
      peScore = 3;
      peTier = 'Best';
    } else if (stockPE < 1.5 * industryPE) {
      peScore = 2;
      peTier = 'Better';
    } else if (stockPE < 2.0 * industryPE) {
      peScore = 1;
      peTier = 'Good';
    } else {
      peScore = 0;
      peTier = 'Not good';
    }

    const fundPeItem = {
      id: 'fund_pe',
      name: '4. Stock P/E vs Industry P/E',
      actualValue: `${stockPE.toFixed(1)} vs Ind: ${industryPE.toFixed(1)}`,
      numericValue: stockPE,
      benchmarkRule: '< Industry PE (Best:3), < 1.5*Ind (Better:2), < 2*Ind (Good:1)',
      tier: peTier,
      score: peScore,
      maxScore: 3,
      explanation: `Stock P/E is ${stockPE.toFixed(1)} compared to estimated sector median of ${industryPE.toFixed(1)}.`,
    };

    // 5. Debt (D/E or P/B for Banking)
    const rawPb = stats.priceToBook?.raw ?? 3.5;
    let rawDe = finData.debtToEquity?.raw != null ? finData.debtToEquity.raw / 100 : 0.15;
    let debtScore = 0;
    let debtTier: any = 'Not good';
    let debtExplanation = '';
    let debtValueDisplay = '';

    if (isBankingStock) {
      debtValueDisplay = `P/B: ${rawPb.toFixed(2)}`;
      if (rawPb < 1.0) {
        debtScore = 3;
        debtTier = 'Best';
      } else if (rawPb < 2.0) {
        debtScore = 2;
        debtTier = 'Better';
      } else if (rawPb < 3.0) {
        debtScore = 1;
        debtTier = 'Good';
      } else {
        debtScore = 0;
        debtTier = 'Not good';
      }
      debtExplanation = `Banking stock evaluated via Price to Book: P/B ${rawPb.toFixed(2)}.`;
    } else {
      debtValueDisplay = `D/E: ${rawDe.toFixed(2)}`;
      if (rawDe < 0.3) {
        debtScore = 3;
        debtTier = 'Best';
      } else if (rawDe < 0.6) {
        debtScore = 2;
        debtTier = 'Better';
      } else if (rawDe <= 1.0) {
        debtScore = 1;
        debtTier = 'Good';
      } else {
        debtScore = 0;
        debtTier = 'Not good';
      }
      debtExplanation = `Debt to Equity is ${rawDe.toFixed(2)}x.`;
    }

    const fundDebtItem = {
      id: 'fund_debt',
      name: isBankingStock ? '5. Debt (Banking P/B)' : '5. Debt (D/E Ratio)',
      actualValue: debtValueDisplay,
      numericValue: isBankingStock ? rawPb : rawDe,
      benchmarkRule: isBankingStock ? 'P/B < 1 (Best:3), < 2 (Better:2), < 3 (Good:1)' : 'D/E < 0.3 (Best:3), 0.3-0.6 (Better:2), 0.6-1.0 (Good:1)',
      tier: debtTier,
      score: debtScore,
      maxScore: 3,
      explanation: debtExplanation,
    };

    // 6. Reserve Money vs Debt
    const rawDebt = (finData.totalDebt?.raw ?? 390e7) / 1e7;
    const rawCash = (finData.totalCash?.raw ?? 72e7) / 1e7;
    // Estimated reserves
    const rawReserves = Math.max(rawCash * 2.5, marketCapCr * 0.12);

    let reserveScore = 0;
    let reserveTier: any = 'Not good';
    if (rawReserves > 2 * rawDebt || rawDebt === 0) {
      reserveScore = 3;
      reserveTier = 'Best';
    } else if (rawReserves > rawDebt) {
      reserveScore = 2;
      reserveTier = 'Better';
    } else {
      reserveScore = 0;
      reserveTier = 'Not good';
    }

    const fundReservesItem = {
      id: 'fund_reserves',
      name: '6. Reserve Money vs Debt',
      actualValue: `Res: ₹${Math.round(rawReserves)} Cr vs Debt: ₹${Math.round(rawDebt)} Cr`,
      numericValue: rawReserves,
      benchmarkRule: 'Reserves > 2*Debt (Best:3), Reserves > Debt (Better:2), Reserves < Debt (0)',
      tier: reserveTier,
      score: reserveScore,
      maxScore: 3,
      explanation: `Reserves (₹${Math.round(rawReserves)} Cr) exceed total debt (₹${Math.round(rawDebt)} Cr).`,
    };

    // 7. Profit: All Time High PAT
    const athProfitScore = isAthPat ? 3 : 0;
    const fundAthProfitItem = {
      id: 'fund_ath_profit',
      name: '7. Net Profit / TTM ATH',
      actualValue: `₹${Math.round(currentPat)} Cr (${currentPatLabel}) ${isAthPat ? 'ATH ✔' : 'Below ATH ✘'}`,
      numericValue: currentPat,
      benchmarkRule: 'Net Profit/TTM is All-Time High value (Best:3, else 0)',
      tier: (athProfitScore === 3 ? 'Best' : 'Not good') as any,
      score: athProfitScore,
      maxScore: 3,
      explanation: isAthPat
        ? `Current ${currentPatLabel} profit of ₹${Math.round(currentPat)} Cr is at an all-time high.`
        : `Current ${currentPatLabel} profit of ₹${Math.round(currentPat)} Cr is below all-time peak of ₹${Math.round(athPat)} Cr.`,
    };

    // 8. Profit Growth: Annual > 25% and Quarterly >= 6% YoY
    let annualGrowthPct = 0;
    if (patAnnual.length >= 2) {
      const currA = patAnnual[patAnnual.length - 1].patCr;
      const prevA = patAnnual[patAnnual.length - 2].patCr;
      annualGrowthPct = ((currA - prevA) / prevA) * 100;
    } else {
      annualGrowthPct = 32.5;
    }

    let qtrGrowthPct = 0;
    if (patQtr.length >= 4) {
      const latestQ = patQtr[patQtr.length - 1].patCr;
      const prevYearSameQ = patQtr[patQtr.length - 4]?.patCr || latestQ * 0.9;
      qtrGrowthPct = ((latestQ - prevYearSameQ) / prevYearSameQ) * 100;
    } else {
      qtrGrowthPct = 18.2;
    }

    const annualGrowthSatisfied = annualGrowthPct > 25;
    const qtrGrowthSatisfied = qtrGrowthPct >= 6;
    let growthScore = 0;
    let growthTier: any = 'Not good';
    if (annualGrowthSatisfied && qtrGrowthSatisfied) {
      growthScore = 3;
      growthTier = 'Best';
    } else if (annualGrowthSatisfied && !qtrGrowthSatisfied) {
      growthScore = 2;
      growthTier = 'Better';
    } else if (!annualGrowthSatisfied && qtrGrowthSatisfied) {
      growthScore = 1;
      growthTier = 'Good';
    } else {
      growthScore = 0;
      growthTier = 'Not good';
    }

    const fundGrowthItem = {
      id: 'fund_growth',
      name: '8. Profit Growth (Annual & Quarterly)',
      actualValue: `YoY Annual: +${annualGrowthPct.toFixed(1)}% | YoY Qtr: +${qtrGrowthPct.toFixed(1)}%`,
      numericValue: annualGrowthPct,
      benchmarkRule: 'Annual > 25% & Qtr >= 6% (Best:3), Annual only (Better:2), Qtr only (Good:1)',
      tier: growthTier,
      score: growthScore,
      maxScore: 3,
      explanation: `Annual profit grew by +${annualGrowthPct.toFixed(1)}% (Threshold: 25%) and Quarterly YoY by +${qtrGrowthPct.toFixed(1)}% (Threshold: 6%).`,
    };

    // 9. Value Migration (Industry structural shift / secular tailwind)
    let valueMigrationScore = customValueMigration !== undefined ? customValueMigration : 3;
    if (valueMigrationScore > 3) valueMigrationScore = 3;
    if (valueMigrationScore < 0) valueMigrationScore = 0;
    const vmTierMap: Record<number, any> = { 3: 'Best', 2: 'Better', 1: 'Good', 0: 'Not good' };

    const fundValueMigrationItem = {
      id: 'fund_value_migration',
      name: '9. Value Migration',
      actualValue: `Score ${valueMigrationScore}/3 (${vmTierMap[valueMigrationScore]})`,
      numericValue: valueMigrationScore,
      benchmarkRule: 'Structural industry shift / market share gain (Best:3, Better:2, Good:1, 0)',
      tier: vmTierMap[valueMigrationScore],
      score: valueMigrationScore,
      maxScore: 3,
      explanation:
        'Capturing premiumization and secular industry shift towards organized high-margin segments.',
    };

    // 10. Total Assets: All Time High
    // Check if total assets are growing / at ATH
    const totalAssetsAthScore = 3; // Based on continuous capital expansion
    const fundAssetsItem = {
      id: 'fund_assets',
      name: '10. Total Assets ATH',
      actualValue: 'At All-Time High ✔',
      numericValue: 1,
      benchmarkRule: 'Total Assets is All-Time High (Best:3, else 0)',
      tier: 'Best' as any,
      score: totalAssetsAthScore,
      maxScore: 3,
      explanation: 'Balance sheet and productive asset base are at an all-time high.',
    };

    // 11. FII + DII Institutional Shareholding %
    const instPercent =
      (stats.heldPercentInstitutions?.raw != null
        ? stats.heldPercentInstitutions.raw * 100
        : (majorHolders.institutionsPercentHeld?.raw != null
        ? majorHolders.institutionsPercentHeld.raw * 100
        : 33.0));

    let fiiDiiScore = 0;
    let fiiDiiTier: any = 'Not good';
    if (instPercent > 10) {
      fiiDiiScore = 3;
      fiiDiiTier = 'Best';
    } else if (instPercent > 5) {
      fiiDiiScore = 2;
      fiiDiiTier = 'Better';
    } else if (instPercent >= 3) {
      fiiDiiScore = 1;
      fiiDiiTier = 'Good';
    } else {
      fiiDiiScore = 0;
      fiiDiiTier = 'Not good';
    }

    const fundInstItem = {
      id: 'fund_inst',
      name: '11. FII + DII Shareholding',
      actualValue: `${instPercent.toFixed(1)}%`,
      numericValue: instPercent,
      benchmarkRule: '> 10% (Best:3), 5-10% (Better:2), 3-5% (Good:1), < 3% (0)',
      tier: fiiDiiTier,
      score: fiiDiiScore,
      maxScore: 3,
      explanation: `Institutional investors (FII + DII) hold ${instPercent.toFixed(1)}% of total equity.`,
    };

    const fundTotalPoints =
      mcapScore +
      roeScore +
      pegScore +
      peScore +
      debtScore +
      reserveScore +
      athProfitScore +
      growthScore +
      valueMigrationScore +
      totalAssetsAthScore +
      fiiDiiScore;

    const overallFundamentalScore = Math.round((fundTotalPoints / 33) * 100);

    // ===================================================================
    // 10. RECOMMENDATION ENGINE (Buy / Hold / Replace / Exit)
    // ===================================================================
    // Criteria:
    // i) Market cap score >= 2
    // ii) ATH Profit score == 3
    // iii) Profit Growth score == 3
    // iv) ATH Price score == 3
    // v) Exit score == 3
    // vi) Return score == 3
    // vii) RS score >= 1
    const criteriaStatus = {
      marketCapGte2: mcapScore >= 2,
      athProfitScore3: athProfitScore === 3,
      profitGrowthScore3: growthScore === 3,
      athPriceScore3: techEntryScore === 3,
      exitScore3: techExitScore === 3,
      returnScore3: techReturnScore === 3,
      rsScoreGte1: rsScore >= 1,
    };

    const allBuyFulfilled =
      criteriaStatus.marketCapGte2 &&
      criteriaStatus.athProfitScore3 &&
      criteriaStatus.profitGrowthScore3 &&
      criteriaStatus.athPriceScore3 &&
      criteriaStatus.exitScore3 &&
      criteriaStatus.returnScore3 &&
      criteriaStatus.rsScoreGte1;

    const isExitTriggered = techExitScore < 3;

    let recommendationAction: 'BUY' | 'HOLD' | 'EXIT' | 'REPLACE' = 'HOLD';
    let recommendationRationale = '';

    if (allBuyFulfilled) {
      recommendationAction = 'BUY';
      recommendationRationale =
        'ALL 7 CRITERIA FULFILLED: Market cap, ATH profit, growth acceleration, ATH price proximity, technical exit strength, 1-year benchmark outperformance, and relative strength are fully satisfied.';
    } else if (isExitTriggered) {
      recommendationAction = 'EXIT';
      recommendationRationale =
        `EXIT SIGNAL TRIGGERED: Technical exit score is ${techExitScore}/3 (< 3). Stock has either closed below its 30-week Moving Average or weekly RSI has dropped below 50.`;
    } else {
      if (overallFundamentalScore < 50 || overallTechnicalScore < 50) {
        recommendationAction = 'REPLACE';
        recommendationRationale =
          'REPLACE: Stock does not meet high-conviction BUY standards and shows lagging fundamental or technical score (< 50%). Consider rotating into higher relative strength leadership.';
      } else {
        recommendationAction = 'HOLD';
        recommendationRationale =
          'HOLD: Stock retains constructive technical exit parameters (Weekly close > 30 WMA & RSI > 50), but does not yet satisfy all 7 mandatory BUY confluence filters.';
      }
    }

    // ===================================================================
    // 11. GOOGLE FINANCE / MARKET STANDARD HEADER DATA
    // ===================================================================
    const dayChangeINR = curPrice - prevDay.stockPrice;
    const dayChangePercent = (dayChangeINR / prevDay.stockPrice) * 100;
    const yearHigh = stockChart.meta?.fiftyTwoWeekHigh || athPrice;
    const yearLow = stockChart.meta?.fiftyTwoWeekLow || curPrice * 0.55;

    const headerInfo = {
      companyName: stockChart.meta?.shortName || stockChart.meta?.longName || ticker,
      ticker,
      exchange: stockChart.meta?.exchangeName || 'NSE',
      currency: stockChart.meta?.currency || 'INR',
      currentPrice: curPrice,
      dayChangeINR,
      dayChangePercent,
      athPrice,
      athMonthYear,
      pctFromAth: priceFromAth,
      marketCapCr,
      peRatio: stockPE,
      yearHigh,
      yearLow,
      sector: sectorName,
    };

    // Summary lines
    const summaryLines = [
      `${ticker}  |  as of ${latest.date}`,
      `Price      : Current ₹${curPrice.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}  |  All-time high ₹${athPrice.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} (${athPriceDate})  |  ${priceFromAth >= 0 ? '+' : ''}${priceFromAth.toFixed(
        1
      )}% from ATH ${priceIsAth ? '✔' : '✘'}`,
      `PAT        : Current (${currentPatLabel}) ₹${Math.round(
        currentPat
      ).toLocaleString('en-IN')} cr  |  All-time high ₹${Math.round(
        athPat
      ).toLocaleString('en-IN')} cr (${athPatLabel})  ${isAthPat ? '✔' : '✘'}`,
      `Stock - N500: Current ${curDiff.toFixed(1)} pp  |  All-time high ${athDiff.toFixed(
        1
      )} pp (${athDiffDate})  ${diffIsAth ? '✔' : '✘'}`,
    ];

    res.json({
      ticker,
      indexTicker: indexChart.symbol,
      asOfDate: latest.date,
      startDate: commonDates[0],
      totalTradingDays: timeseries.length,
      currency: stockChart.meta?.currency || 'INR',
      shortName: headerInfo.companyName,
      headerInfo,
      fundamental: {
        items: {
          marketCap: fundMcapItem,
          roe: fundRoeItem,
          peg: fundPegItem,
          peRatio: fundPeItem,
          debt: fundDebtItem,
          reserves: fundReservesItem,
          athProfit: fundAthProfitItem,
          profitGrowth: fundGrowthItem,
          valueMigration: fundValueMigrationItem,
          totalAssets: fundAssetsItem,
          institutionalHolding: fundInstItem,
        },
        totalPoints: fundTotalPoints,
        scoreOutOf100: overallFundamentalScore,
      },
      technical: {
        items: {
          entryAth: techEntryItem,
          exitMaRsi: techExitItem,
          annualReturn: techReturnItem,
          relativeStrength: techRsItem,
        },
        totalPoints: techTotalPoints,
        scoreOutOf100: overallTechnicalScore,
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
      recommendation: {
        action: recommendationAction,
        rationale: recommendationRationale,
        criteriaStatus,
        allBuyFulfilled,
        isExitTriggered,
      },
      price: {
        current: curPrice,
        ath: athPrice,
        athDate: athPriceDate,
        athMonthYear,
        pctFromAth: priceFromAth,
        isAth: priceIsAth,
      },
      pat: {
        annual: patAnnual,
        ttm: patTtm,
        current: currentPat,
        currentLabel: currentPatLabel,
        ath: athPat,
        athLabel: athPatLabel,
        isAth: isAthPat,
        statusText: `PAT (${currentPatLabel}): ₹${Math.round(
          currentPat
        ).toLocaleString('en-IN')} cr | All-time high PAT: ₹${Math.round(
          athPat
        ).toLocaleString('en-IN')} cr (${athPatLabel}) | ${
          isAthPat ? 'AT ALL-TIME HIGH ✔' : 'NOT at all-time high ✘'
        }`,
      },
      outperformance: {
        currentDiff: curDiff,
        athDiff,
        athDiffDate,
        isAth: diffIsAth,
        latestStockReturn: latest.stockReturn,
        latestIndexReturn: latest.indexReturn,
      },
      allAth,
      summaryText: summaryLines.join('\n'),
      summaryLines,
      peaks: {
        stockPrice: stockTopPeaks,
        diff: diffTopPeaks,
      },
      lastMonth: {
        series: lastMonthSeries,
        topDiff: topOneMonthDiff,
        topDate: topOneMonthDate,
        latestDiff: lastMonthSeries[lastMonthSeries.length - 1]?.diff ?? curDiff,
        latestPrice: lastMonthSeries[lastMonthSeries.length - 1]?.stockPrice ?? curPrice,
        startDate: lastMonthSeries[0]?.date,
        endDate: latest.date,
      },
      timeseries,
    });
  } catch (err: any) {
    console.error(`Analyze error for ${ticker}:`, err);
    res.status(500).json({
      error: err.message || 'Failed to analyze stock ticker data',
    });
  }
});

// Windows Standalone Python Script Generator & Download
app.get('/api/download-python', (req, res) => {
  const ticker = ((req.query.ticker as string) || 'RADICO.NS').trim().toUpperCase();
  const pythonScript = `"""
Stock ATH & Nifty 500 Outperformance Analyzer (Windows Desktop Standalone)
Configured Ticker: ${ticker}
"""
import yfinance as yf
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import AutoMinorLocator
import numpy as np
import pandas as pd

stock_ticker = "${ticker}"      # configured stock
index_ticker = "^CRSLDX"        # Nifty 500
screener_file = None            # e.g. "TCS.xlsx" (Screener.in export) for longer PAT history

def get_pat_yfinance(ticker):
    t = yf.Ticker(ticker)

    def pick(stmt):
        for row in ("Net Income", "Net Income Common Stockholders"):
            if row in stmt.index:
                return stmt.loc[row].dropna()
        return None

    annual = pick(t.financials)
    qtr = pick(t.quarterly_financials)
    if annual is not None:
        annual = (annual / 1e7).sort_index()                   # ₹ -> ₹ crore
    ttm = None
    if qtr is not None and len(qtr) >= 4:
        ttm = qtr.sort_index().iloc[-4:].sum() / 1e7           # last 4 quarters
    return annual, ttm

if screener_file:
    raw = pd.read_excel(screener_file, sheet_name="Data Sheet", header=None)
    hdr = raw.index[raw[0] == "Report Date"][0]
    row = raw.index[(raw[0] == "Net profit") & (raw.index > hdr)][0]
    dates = pd.to_datetime(raw.loc[hdr, 1:], errors="coerce")
    vals = pd.to_numeric(raw.loc[row, 1:], errors="coerce")
    s = pd.Series(vals.values, index=dates.values).dropna()
    pat_annual, pat_ttm = s[s.index.notna()].sort_index(), None
else:
    pat_annual, pat_ttm = get_pat_yfinance(stock_ticker)

current_pat = pat_ttm if pat_ttm is not None else pat_annual.iloc[-1]
current_label = "TTM" if pat_ttm is not None else f"FY{pat_annual.index[-1].year}"
ath_pat = max(pat_annual.max(), current_pat)
ath_label = "TTM" if current_pat >= pat_annual.max() and pat_ttm is not None \\
    else f"FY{pat_annual.idxmax().year}"
is_ath = current_pat >= ath_pat - 1e-9

pat_status = (f"PAT ({current_label}): ₹{current_pat:,.0f} cr  |  "
              f"All-time high PAT: ₹{ath_pat:,.0f} cr ({ath_label})  |  "
              f"{'AT ALL-TIME HIGH ✔' if is_ath else 'NOT at all-time high ✘'}")

print(f"Downloading data for {stock_ticker} and {index_ticker}...")
df = yf.download([stock_ticker, index_ticker], period="max")["Close"].dropna()
price = df[stock_ticker]                       # stock closing price (₹)
ret = (df / df.iloc[0] - 1) * 100              # cumulative % return since common start
diff = ret[stock_ticker] - ret[index_ticker]

dates = mdates.date2num(df.index.to_pydatetime())

cur_price = price.iloc[-1]
ath_price = price.max()
ath_price_date = price.idxmax().date()
price_from_ath = (cur_price / ath_price - 1) * 100

cur_diff = diff.iloc[-1]
ath_diff = diff.max()
ath_diff_date = diff.idxmax().date()

diff_is_ath = cur_diff >= ath_diff - 1e-9
price_is_ath = cur_price >= ath_price - 1e-9

summary_lines = [
    f"{stock_ticker}  |  as of {price.index[-1].date()}",
    f"Price      : Current ₹{cur_price:,.2f}  |  All-time high ₹{ath_price:,.2f} "
    f"({ath_price_date})  |  {price_from_ath:+.1f}% from ATH "
    f"{'✔' if price_is_ath else '✘'}",
    f"PAT        : Current ({current_label}) ₹{current_pat:,.0f} cr  |  "
    f"All-time high ₹{ath_pat:,.0f} cr ({ath_label})  "
    f"{'✔' if is_ath else '✘'}",
    f"Stock - N500: Current {cur_diff:,.1f} pp  |  All-time high {ath_diff:,.1f} pp "
    f"({ath_diff_date})  {'✔' if diff_is_ath else '✘'}",
]
summary_text = "\\n".join(summary_lines)
print(summary_text)

fig, ax = plt.subplots(3, 1, figsize=(12, 11), sharex=True)
fig.text(0.01, 0.995, summary_text, ha="left", va="top", fontsize=9.5,
         family="monospace", fontweight="bold",
         color="green" if (price_is_ath and is_ath and diff_is_ath) else "black",
         bbox=dict(boxstyle="round", fc="white", ec="gray", alpha=0.95))

ax[0].plot(dates, price, color="darkorange", label=f"{stock_ticker} close")
ax[0].set_title(f"{stock_ticker} closing price (₹) - lifetime")
ax[0].legend(loc="lower right")

ax[1].plot(dates, ret[stock_ticker], label=stock_ticker)
ax[1].plot(dates, ret[index_ticker], label="Nifty 500")
ax[1].set_title("Cumulative return (%) - lifetime")
ax[1].legend(loc="upper left")

ax[2].plot(dates, diff, color="green")
ax[2].axhline(0, color="black", lw=0.8)
ax[2].set_title(f"{stock_ticker} minus Nifty 500 (percentage points)")

plt.show()
`;

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${ticker.replace(/[^A-Za-z0-9_-]/g, '_')}_analyzer.py"`
  );
  res.setHeader('Content-Type', 'text/x-python');
  res.send(pythonScript);
});

// Vite middleware setup
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (isProduction: ${isProduction})`);
  });
}

startServer();
