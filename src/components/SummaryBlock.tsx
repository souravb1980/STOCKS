import React, { useState } from 'react';
import { StockAnalysisData } from '../types';
import { CheckCircle2, XCircle, Copy, Check, TrendingUp, DollarSign, Award, Flame } from 'lucide-react';

interface SummaryBlockProps {
  data: StockAnalysisData;
}

export const SummaryBlock: React.FC<SummaryBlockProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAllAth = data.allAth;

  return (
    <div className="space-y-4">
      {/* Visual KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Stock Price */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition ${
            data.price.isAth
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg'
              : 'bg-slate-900/90 border-slate-800/80 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
              Stock Close Price
            </span>
            {data.price.isAth ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ATH ✔
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                <XCircle className="w-3.5 h-3.5 text-rose-400" /> NOT ATH ✘
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              ₹{data.price.current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                data.price.pctFromAth >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {data.price.pctFromAth >= 0 ? '+' : ''}
              {data.price.pctFromAth.toFixed(1)}% from ATH
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2 font-mono">
            <span>All-time high:</span>
            <span className="text-slate-200 font-semibold">
              ₹{data.price.ath.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-slate-500 font-normal">({data.price.athDate})</span>
            </span>
          </div>
        </div>

        {/* Card 2: PAT (Profit After Tax) */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition ${
            data.pat.isAth
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg'
              : 'bg-slate-900/90 border-slate-800/80 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
              Profit After Tax ({data.pat.currentLabel})
            </span>
            {data.pat.isAth ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ATH ✔
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                <XCircle className="w-3.5 h-3.5 text-rose-400" /> NOT ATH ✘
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              ₹{Math.round(data.pat.current).toLocaleString('en-IN')}{' '}
              <span className="text-base text-slate-400 font-sans font-normal">cr</span>
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2 font-mono">
            <span>All-time high PAT:</span>
            <span className="text-slate-200 font-semibold">
              ₹{Math.round(data.pat.ath).toLocaleString('en-IN')} cr{' '}
              <span className="text-slate-500 font-normal">({data.pat.athLabel})</span>
            </span>
          </div>
        </div>

        {/* Card 3: Outperformance vs Nifty 500 */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition ${
            data.outperformance.isAth
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg'
              : 'bg-slate-900/90 border-slate-800/80 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
              Stock minus Nifty 500
            </span>
            {data.outperformance.isAth ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ATH ✔
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                <XCircle className="w-3.5 h-3.5 text-rose-400" /> NOT ATH ✘
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                data.outperformance.currentDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {data.outperformance.currentDiff >= 0 ? '+' : ''}
              {data.outperformance.currentDiff.toFixed(1)}{' '}
              <span className="text-base font-sans font-normal text-slate-400">pp</span>
            </span>
            <span className="text-xs text-slate-400 font-sans">vs ^CRSLDX</span>
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2 font-mono">
            <span>All-time high diff:</span>
            <span className="text-slate-200 font-semibold">
              {data.outperformance.athDiff.toFixed(1)} pp{' '}
              <span className="text-slate-500 font-normal">({data.outperformance.athDiffDate})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Python Program Monospace Summary Block */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 font-mono text-xs sm:text-sm shadow-xl relative ${
          isAllAth
            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
            : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-sans text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Analysis Summary Output (as in Python Script)
            </span>
            {isAllAth && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-500 text-slate-950 rounded-full">
                <Flame className="w-3 h-3" /> TRIPLE ATH CONFLUENCE
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans transition border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <pre className="whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto text-[11px] sm:text-xs">
          {data.summaryLines.map((line, idx) => {
            const hasCheck = line.includes('✔');
            return (
              <div
                key={idx}
                className={`py-0.5 ${
                  hasCheck
                    ? 'text-emerald-300 font-bold'
                    : idx === 0
                    ? 'text-white font-bold text-sm border-b border-slate-800/80 pb-1 mb-1'
                    : 'text-slate-300'
                }`}
              >
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};
