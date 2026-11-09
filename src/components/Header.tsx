import React from 'react';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentTicker: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTicker }) => {
  const handleDownloadPython = () => {
    window.location.href = `/api/download-python?ticker=${encodeURIComponent(currentTicker)}`;
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-400 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400 font-black text-lg">
              ₹
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Stock ATH & Nifty 500 Analyzer
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Institutional v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Lifetime Price ATH • PAT Milestones • 11 Fundamental + 4 Technical Criteria
            </p>
          </div>
        </div>

        {/* Actions & Attribution */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="hidden sm:flex items-center text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 mr-1.5">Developed by</span>
            <span className="text-emerald-400 font-bold">Sourav Kumar Bhowmick</span>
          </div>

          {/* Download configured Python script button */}
          <button
            onClick={handleDownloadPython}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            title={`Download Python script configured for ${currentTicker}`}
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Download .py Script</span>
          </button>
        </div>
      </div>
    </header>
  );
};
