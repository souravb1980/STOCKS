import React, { useState } from 'react';
import { StockAnalysisData } from '../types';
import { X, Table, FileSpreadsheet, Download } from 'lucide-react';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StockAnalysisData;
}

export const DataTableModal: React.FC<DataTableModalProps> = ({ isOpen, onClose, data }) => {
  const [activeTab, setActiveTab] = useState<'prices' | 'pat'>('prices');

  if (!isOpen) return null;

  const handleExportCsv = () => {
    let csv = 'Date,Stock Price,Benchmark Price,Stock Cumulative Return %,Benchmark Cumulative Return %,Difference pp\n';
    for (const pt of data.timeseries) {
      csv += `${pt.date},${pt.stockPrice},${pt.indexPrice},${pt.stockReturn.toFixed(2)},${pt.indexReturn.toFixed(2)},${pt.diff.toFixed(2)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.ticker}_historical_comparison.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Data Inspector & Raw Series ({data.ticker})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-900 border-b border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('prices')}
            className={`pb-2.5 px-2 font-bold transition border-b-2 ${
              activeTab === 'prices'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Prices & Returns ({data.timeseries.length} days)
          </button>
          <button
            onClick={() => setActiveTab('pat')}
            className={`pb-2.5 px-2 font-bold transition border-b-2 ${
              activeTab === 'pat'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            PAT Statements (₹ Crore)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300">
          {activeTab === 'prices' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">{data.ticker} (₹)</th>
                    <th className="py-2.5 px-3">^CRSLDX (₹)</th>
                    <th className="py-2.5 px-3">{data.ticker} Ret (%)</th>
                    <th className="py-2.5 px-3">N500 Ret (%)</th>
                    <th className="py-2.5 px-3">Difference (pp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.timeseries.slice(-100).reverse().map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-white font-medium">{pt.date}</td>
                      <td className="py-2 px-3 font-semibold text-amber-400">₹{pt.stockPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-400">₹{pt.indexPrice.toFixed(2)}</td>
                      <td className={`py-2 px-3 font-medium ${pt.stockReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pt.stockReturn >= 0 ? '+' : ''}{pt.stockReturn.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 font-medium ${pt.indexReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pt.indexReturn >= 0 ? '+' : ''}{pt.indexReturn.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 font-bold ${pt.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pt.diff >= 0 ? '+' : ''}{pt.diff.toFixed(1)} pp
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Report Date</th>
                    <th className="py-2.5 px-3">PAT (₹ Crore)</th>
                    <th className="py-2.5 px-3">ATH Comparison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.pat.annual.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-blue-400 font-bold">{item.label}</td>
                      <td className="py-2 px-3 text-slate-400">{item.date}</td>
                      <td className="py-2 px-3 text-white font-bold">₹{Math.round(item.patCr).toLocaleString('en-IN')} cr</td>
                      <td className="py-2 px-3 text-slate-400">
                        {item.patCr >= data.pat.ath - 1e-4 ? '✔ All-Time High' : 'Below ATH'}
                      </td>
                    </tr>
                  ))}
                  {data.pat.ttm != null && (
                    <tr className="bg-emerald-950/40 font-bold">
                      <td className="py-2 px-3 text-emerald-400">TTM (Trailing 12 Months)</td>
                      <td className="py-2 px-3 text-slate-400">Sum of last 4 Quarters</td>
                      <td className="py-2 px-3 text-emerald-300">₹{Math.round(data.pat.ttm).toLocaleString('en-IN')} cr</td>
                      <td className="py-2 px-3 text-emerald-400">
                        {data.pat.isAth ? '✔ CURRENT ALL-TIME HIGH' : 'Below ATH'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
