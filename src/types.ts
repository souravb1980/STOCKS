export interface TimeseriesPoint {
  date: string;
  stockPrice: number;
  indexPrice: number;
  stockReturn: number;
  indexReturn: number;
  diff: number;
}

export interface PeakPoint {
  date: string;
  value: number;
  index: number;
  rank: number;
}

export interface PatItem {
  date: string;
  label: string;
  patCr: number;
}

export type ScoreTier = 'Best' | 'Better' | 'Good' | 'Not good';

export interface ScoreItem {
  id: string;
  name: string;
  actualValue: string | number;
  numericValue?: number;
  benchmarkRule: string;
  tier: ScoreTier;
  score: number; // 0 to 3
  maxScore: number; // 3
  explanation: string;
}

export interface FundamentalAnalysis {
  items: {
    marketCap: ScoreItem;
    roe: ScoreItem;
    peg: ScoreItem;
    peRatio: ScoreItem;
    debt: ScoreItem;
    reserves: ScoreItem;
    athProfit: ScoreItem;
    profitGrowth: ScoreItem;
    valueMigration: ScoreItem;
    totalAssets: ScoreItem;
    institutionalHolding: ScoreItem;
  };
  totalPoints: number; // sum out of 33
  scoreOutOf100: number; // scaled to 100
}

export interface TechnicalAnalysis {
  items: {
    entryAth: ScoreItem;
    exitMaRsi: ScoreItem;
    annualReturn: ScoreItem;
    relativeStrength: ScoreItem;
  };
  totalPoints: number; // sum out of 12
  scoreOutOf100: number; // scaled to 100
  weeklyClose: number;
  weekly30MA: number;
  weeklyRSI: number;
  stock365dReturn: number;
  index365dReturn: number;
  benchmarkMultiplier: number; // 1.61 * index365dReturn
  relativeStrengthPP: number; // stock365d - index365d
  isNearAth: boolean; // within 7%
  athPrice: number;
}

export type RecommendationType = 'BUY' | 'HOLD' | 'EXIT' | 'REPLACE';

export interface RecommendationResult {
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
}

export interface StockHeaderInfo {
  companyName: string;
  ticker: string;
  exchange: string;
  currency: string;
  currentPrice: number;
  dayChangeINR: number;
  dayChangePercent: number;
  athPrice: number;
  athMonthYear: string;
  pctFromAth: number;
  marketCapCr: number;
  peRatio: number;
  yearHigh: number;
  yearLow: number;
  sector: string;
}

export interface StockAnalysisData {
  ticker: string;
  indexTicker: string;
  asOfDate: string;
  startDate: string;
  totalTradingDays: number;
  currency: string;
  shortName: string;
  headerInfo: StockHeaderInfo;
  fundamental: FundamentalAnalysis;
  technical: TechnicalAnalysis;
  recommendation: RecommendationResult;
  price: {
    current: number;
    ath: number;
    athDate: string;
    athMonthYear: string;
    pctFromAth: number;
    isAth: boolean;
  };
  pat: {
    annual: PatItem[];
    ttm: number | null;
    current: number;
    currentLabel: string;
    ath: number;
    athLabel: string;
    isAth: boolean;
    statusText: string;
  };
  outperformance: {
    currentDiff: number;
    athDiff: number;
    athDiffDate: string;
    isAth: boolean;
    latestStockReturn: number;
    latestIndexReturn: number;
  };
  allAth: boolean;
  summaryText: string;
  summaryLines: string[];
  peaks: {
    stockPrice: PeakPoint[];
    diff: PeakPoint[];
  };
  lastMonth: {
    series: TimeseriesPoint[];
    topDiff: number;
    topDate: string;
    latestDiff: number;
    latestPrice: number;
    startDate: string;
    endDate: string;
  };
  timeseries: TimeseriesPoint[];
}
