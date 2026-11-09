import React from 'react';
import { StockHeaderInfo, TechnicalAnalysis } from '../types';
import { TrendingUp, TrendingDown, Award, Calendar, BarChart3, Activity, ShieldCheck } from 'lucide-react';

interface StockHeaderBlockProps {
  headerInfo: StockHeaderInfo;
  technical: TechnicalAnalysis;
}

export const StockHeaderBlock: React.FC<StockHeaderBlockProps> = ({ headerInfo, technical }) => {
  const isPositiveDay = headerInfo.dayChangeINR >= 0;
  const isAthNow = headerInfo.pctFromAth >= -0.05;

  // 52-week position percentage
  const rangeSpan = headerInfo.yearHigh - headerInfo.yearLow;
  const rangePct = rangeSpan > 0
    ? Math.min(100, Math.max(0, ((headerInfo.currentPrice - headerInfo.yearLow) / rangeSpan) * 100))
    : 100;

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur">
      {/* Background soft ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
        {/* Left Column: Company, Ticker, Current Price, Day Change */}
        <div className="space-y-3">
          {/* Breadcrumbs & Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
              {headerInfo.ticker}
            </span>
            <span className="text-slate-600 font-mono">·</span>
            <span className="text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              {headerInfo.exchange}
            </span>
            <span className="text-slate-600 font-mono">·</span>
            <span className="text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              {headerInfo.currency} (₹)
            </span>
            <span className="text-slate-600 font-mono">·</span>
            <span className="text-slate-400 text-[11px] truncate max-w-xs">
              {headerInfo.sector}
            </span>
          </div>

          {/* Company Full Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              {headerInfo.companyName}
            </h1>
          </div>

          {/* Big Live Price & Day Change */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-white tracking-tight">
              ₹{headerInfo.currentPrice.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>

            {/* Day Change Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-mono font-bold border ${
                isPositiveDay
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                  : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
              }`}
            >
              {isPositiveDay ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )}
              <span>
                {isPositiveDay ? '+' : ''}₹
                {Math.abs(headerInfo.dayChangeINR).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span>
                ({isPositiveDay ? '+' : ''}
                {headerInfo.dayChangePercent.toFixed(2)}%)
              </span>
              <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">
                Today
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: All-Time High Card */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[280px] lg:max-w-sm">
          <div
            className={`p-4 rounded-xl border transition ${
              isAthNow
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                All-Time High Price
              </span>
              {isAthNow ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950">
                  AT ATH ✔
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-rose-400">
                  {headerInfo.pctFromAth.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                ₹{headerInfo.athPrice.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {/* Formatted cleanly as (Month, Year) */}
              <div className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-300 bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>({headerInfo.athMonthYear})</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>ATH Proximity:</span>
              <span className={isAthNow ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                {technical.isNearAth ? 'Within ±7% of ATH ✔' : 'Outside 7% zone'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Statistics Strip */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
        {/* Stat 1: Market Cap */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-sans">
            Market Cap
          </span>
          <p className="text-sm font-bold text-white">
            ₹{headerInfo.marketCapCr.toLocaleString('en-IN')}{' '}
            <span className="text-slate-400 text-xs font-normal">Cr</span>
          </p>
        </div>

        {/* Stat 2: P/E Ratio */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-sans">
            P/E Ratio
          </span>
          <p className="text-sm font-bold text-white">
            {headerInfo.peRatio.toFixed(1)}x
          </p>
        </div>

        {/* Stat 3: 52-Wk Range */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <div className="flex justify-between text-[11px] text-slate-400 font-sans">
            <span>52W Low</span>
            <span>52W High</span>
          </div>
          <div className="relative pt-1">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 rounded-full"
                style={{ width: `${rangePct}%` }}
              ></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>₹{Math.round(headerInfo.yearLow).toLocaleString()}</span>
            <span>₹{Math.round(headerInfo.yearHigh).toLocaleString()}</span>
          </div>
        </div>

        {/* Stat 4: 30-Week MA */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-sans">
            30-Week MA
          </span>
          <p className="text-sm font-bold text-blue-400">
            ₹{technical.weekly30MA.toFixed(1)}
          </p>
        </div>

        {/* Stat 5: Weekly RSI */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-sans">
            Weekly RSI (14)
          </span>
          <p
            className={`text-sm font-bold ${
              technical.weeklyRSI > 50 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {technical.weeklyRSI.toFixed(1)}{' '}
            <span className="text-[10px] text-slate-400 font-normal">
              {technical.weeklyRSI > 50 ? '(Bullish)' : '(Weak)'}
            </span>
          </p>
        </div>

        {/* Stat 6: 1-Year Alpha vs N500 */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-sans">
            365D Alpha vs N500
          </span>
          <p
            className={`text-sm font-bold ${
              technical.relativeStrengthPP >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {technical.relativeStrengthPP >= 0 ? '+' : ''}
            {technical.relativeStrengthPP.toFixed(1)}{' '}
            <span className="text-xs font-normal">pp</span>
          </p>
        </div>
      </div>
    </div>
  );
};
