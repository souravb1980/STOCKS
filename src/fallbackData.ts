import { StockAnalysisData } from './types';
import { generateClientStockAnalysis, BENCHMARK_STOCKS } from './clientStockEngine';

export const FALLBACK_STOCK_DATA: StockAnalysisData =
  BENCHMARK_STOCKS['RADICO.NS'] || generateClientStockAnalysis('RADICO.NS', 3);

export { BENCHMARK_STOCKS, generateClientStockAnalysis };
