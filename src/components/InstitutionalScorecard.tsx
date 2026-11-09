import React, { useState } from 'react';
import {
  StockAnalysisData,
  ScoreItem,
  ScoreTier,
  RecommendationType,
} from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface InstitutionalScorecardProps {
  data: StockAnalysisData;
  onUpdateValueMigration: (newScore: number) => void;
}

export const InstitutionalScorecard: React.FC<InstitutionalScorecardProps> = ({
  data,
  onUpdateValueMigration,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'fundamental' | 'technical'>('all');
  const [isCriteriaExpanded, setIsCriteriaExpanded] = useState(true);

  const { recommendation, fundamental, technical } = data;
  const { criteriaStatus } = recommendation;

  // Tier color styling with sleek dark terminal accents
  const getTierBadge = (tier: ScoreTier, score: number) => {
    switch (tier) {
      case 'Best':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Best ({score}/3)
          </span>
        );
      case 'Better':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/60 text-blue-300 border border-blue-800/60">
            Better ({score}/3)
          </span>
        );
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">
            Good ({score}/3)
          </span>
        );
      case 'Not good':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60">
            <XCircle className="w-3 h-3 text-rose-400" /> Not good ({score}/3)
          </span>
        );
    }
  };

  const getRecBannerStyle = (action: RecommendationType) => {
    switch (action) {
      case 'BUY':
        return {
          bg: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-xl',
          badge: 'bg-emerald-600 text-white border-emerald-500 shadow-lg',
          textColor: 'text-emerald-200',
          icon: <Flame className="w-6 h-6 text-emerald-400 animate-pulse" />,
        };
      case 'EXIT':
        return {
          bg: 'bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-xl',
          badge: 'bg-rose-600 text-white border-rose-500 shadow-lg',
          textColor: 'text-rose-200',
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
        };
      case 'REPLACE':
        return {
          bg: 'bg-purple-950/40 border-purple-500/40 text-purple-100 shadow-xl',
          badge: 'bg-purple-600 text-white border-purple-500 shadow-lg',
          textColor: 'text-purple-200',
          icon: <ArrowUpRight className="w-6 h-6 text-purple-400" />,
        };
      case 'HOLD':
      default:
        return {
          bg: 'bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-xl',
          badge: 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg',
          textColor: 'text-amber-200',
          icon: <ShieldCheck className="w-6 h-6 text-amber-400" />,
        };
    }
  };

  const recStyle = getRecBannerStyle(recommendation.action);

  const fundList: ScoreItem[] = Object.values(fundamental.items);
  const techList: ScoreItem[] = Object.values(technical.items);

  const displayedList =
    activeTab === 'all'
      ? [...fundList, ...techList]
      : activeTab === 'fundamental'
      ? fundList
      : techList;

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. RECOMMENDATION HERO BANNER */}
      {/* =================================================================== */}
      <div className={`rounded-2xl border p-6 transition-all ${recStyle.bg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {recStyle.icon}
              <span className="text-xs uppercase font-extrabold tracking-widest text-slate-600 font-sans">
                Institutional Recommendation Engine
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono tracking-wider px-4 py-1 rounded-xl border ${recStyle.badge}`}
              >
                {recommendation.action}
              </span>
              <p className={`text-sm sm:text-base font-medium ${recStyle.textColor}`}>
                {recommendation.rationale}
              </p>
            </div>
          </div>

          {/* Scores Overview Meter Boxes */}
          {/* Scores Overview Meter Boxes */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Fundamental Score Meter */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center min-w-[125px] shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-sans">
                Fundamental
              </span>
              <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                <span
                  className={`text-2xl font-black font-mono ${
                    fundamental.scoreOutOf100 >= 70
                      ? 'text-emerald-400'
                      : fundamental.scoreOutOf100 >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {fundamental.scoreOutOf100}
                </span>
                <span className="text-xs text-slate-500 font-mono">/100</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {fundamental.totalPoints}/33 pts
              </span>
            </div>

            {/* Technical Score Meter */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center min-w-[125px] shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-sans">
                Technical
              </span>
              <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                <span
                  className={`text-2xl font-black font-mono ${
                    technical.scoreOutOf100 >= 75
                      ? 'text-emerald-400'
                      : technical.scoreOutOf100 >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {technical.scoreOutOf100}
                </span>
                <span className="text-xs text-slate-500 font-mono">/100</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {technical.totalPoints}/12 pts
              </span>
            </div>
          </div>
        </div>

        {/* 7-Criteria Checklist Accordion */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setIsCriteriaExpanded(!isCriteriaExpanded)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>7 Buy / Hold / Exit Confluence Filters Breakdown</span>
              <span className="text-[11px] font-normal text-slate-400">
                ({Object.values(criteriaStatus).filter(Boolean).length}/7 passed)
              </span>
            </span>
            {isCriteriaExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isCriteriaExpanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
              {/* i) Market Cap Score >= 2 */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  criteriaStatus.marketCapGte2
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 font-medium'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span>i. Market Cap Score ≥ 2</span>
                {criteriaStatus.marketCapGte2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* ii) ATH Profit Score == 3 */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  criteriaStatus.athProfitScore3
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 font-medium'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span>ii. ATH Profit Score = 3</span>
                {criteriaStatus.athProfitScore3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* iii) Profit Growth Score == 3 */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  criteriaStatus.profitGrowthScore3
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 font-medium'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span>iii. Profit Growth Score = 3</span>
                {criteriaStatus.profitGrowthScore3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* iv) ATH Price Score == 3 */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  criteriaStatus.athPriceScore3
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 font-medium'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span>iv. ATH Price (±7%) Score = 3</span>
                {criteriaStatus.athPriceScore3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* v) Exit Score == 3 */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  criteriaStatus.exitScore3
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 font-medium'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span>v. Exit (30WMA & RSI) = 3</span>
                {criteriaStatus.exitScore3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* vi) Return Score == 3 */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  criteriaStatus.returnScore3
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 font-medium'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span>vi. Return &gt; 1.61×N500 = 3</span>
                {criteriaStatus.returnScore3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* vii) RS Score >= 1 */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  criteriaStatus.rsScoreGte1
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 font-medium'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span>vii. Relative Strength (RS) ≥ 1</span>
                {criteriaStatus.rsScoreGte1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* Summary Status pill */}
              <div className="p-2.5 rounded-lg border bg-slate-950/60 border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-300">BUY Rule:</span>
                <span
                  className={
                    recommendation.allBuyFulfilled
                      ? 'text-emerald-400 font-bold'
                      : 'text-amber-400 font-semibold'
                  }
                >
                  {recommendation.allBuyFulfilled ? 'ALL 7 PASSED ✔' : 'Incomplete'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. VALUE MIGRATION INTERACTIVE CONTROLLER (Parameter 9) */}
      {/* =================================================================== */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl backdrop-blur">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              Adjust Parameter 9: Value Migration Conviction
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 font-mono border border-indigo-800/60">
              Dynamic Recalculation
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Structural migration of industry value (unorganized to organized, premiumization, market share gains).
          </p>
        </div>

        {/* 4 buttons: Best (3), Better (2), Good (1), Not good (0) */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 font-mono text-xs">
          {[
            { score: 3, label: 'Best (3)' },
            { score: 2, label: 'Better (2)' },
            { score: 1, label: 'Good (1)' },
            { score: 0, label: 'Not good (0)' },
          ].map((item) => {
            const isSelected = fundamental.items.valueMigration.score === item.score;
            return (
              <button
                key={item.score}
                type="button"
                onClick={() => onUpdateValueMigration(item.score)}
                className={`px-3 py-1.5 rounded-lg transition font-bold ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. MASTER SCORECARD TABLE */}
      {/* =================================================================== */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur">
        {/* Table Controls & Filter Tabs */}
        <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <span>Complete Institutional Scoring Matrix</span>
            </h3>
            <p className="text-xs text-slate-400">
              Detailed parameter-by-parameter audit across 11 Fundamental & 4 Technical metrics
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All (15)
            </button>
            <button
              onClick={() => setActiveTab('fundamental')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'fundamental'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fundamental (11)
            </button>
            <button
              onClick={() => setActiveTab('technical')}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === 'technical'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Technical (4)
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-4 font-bold">Parameter</th>
                <th className="py-3 px-4 font-bold">Reported Value</th>
                <th className="py-3 px-4 font-bold">Benchmark Criteria</th>
                <th className="py-3 px-4 font-bold">Status Tier</th>
                <th className="py-3 px-4 font-bold text-center">Points</th>
                <th className="py-3 px-4 font-bold">Audit Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
              {displayedList.map((item) => {
                const isFund = item.id.startsWith('fund');
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/50 transition group"
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-sans font-bold text-white">
                        {item.name}
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">
                        {isFund ? 'Fundamental' : 'Technical'}
                      </span>
                    </td>

                    {/* Reported Value */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      {item.actualValue}
                    </td>

                    {/* Benchmark Criteria */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {item.benchmarkRule}
                    </td>

                    {/* Tier badge */}
                    <td className="py-3.5 px-4">{getTierBadge(item.tier, item.score)}</td>

                    {/* Score points */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-black text-sm px-2.5 py-0.5 rounded-md ${
                          item.score === 3
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                            : item.score === 2
                            ? 'text-blue-400 bg-blue-950/60 border border-blue-800/60'
                            : item.score === 1
                            ? 'text-amber-400 bg-amber-950/60 border border-amber-800/60'
                            : 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                        }`}
                      >
                        {item.score} / 3
                      </span>
                    </td>

                    {/* Explanation */}
                    <td className="py-3.5 px-4 font-sans text-xs text-slate-400 max-w-xs leading-relaxed">
                      {item.explanation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Overall Totals */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-slate-400 font-sans">Total Fundamental: </span>
              <span className="font-bold text-emerald-400 text-sm">
                {fundamental.scoreOutOf100} / 100
              </span>{' '}
              <span className="text-slate-400">({fundamental.totalPoints}/33 pts)</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans">Total Technical: </span>
              <span className="font-bold text-emerald-400 text-sm">
                {technical.scoreOutOf100} / 100
              </span>{' '}
              <span className="text-slate-400">({technical.totalPoints}/12 pts)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-sans">Verdict:</span>
            <span
              className={`px-3 py-1 rounded-lg font-bold uppercase ${recStyle.badge}`}
            >
              {recommendation.action}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
