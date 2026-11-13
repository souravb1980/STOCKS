import React from 'react';
import { Download, Github, ExternalLink } from 'lucide-react';

interface HeaderProps {
  currentTicker: string;
  githubUrl: string;
  onOpenGithubModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTicker,
  githubUrl,
  onOpenGithubModal,
}) => {
  const apiBase =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
      ? 'https://ais-pre-qvyj3tcy3bbsptuy27dqz2-263654441402.asia-southeast1.run.app'
      : '';

  const handleDownloadPython = () => {
    window.location.href = `${apiBase}/api/download-python?ticker=${encodeURIComponent(currentTicker)}`;
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
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Developed by attribution with GitHub profile link */}
          <a
            href="https://github.com/souravb1980"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center text-xs font-mono text-slate-300 bg-slate-900/80 hover:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition group"
            title="View Sourav Kumar Bhowmick on GitHub"
          >
            <span className="text-slate-400 mr-1.5">Developed by</span>
            <span className="text-emerald-400 font-bold group-hover:underline">
              Sourav Kumar Bhowmick
            </span>
          </a>

          {/* GitHub Site Link Button */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shadow-xs">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition"
              title={`Visit GitHub site: ${githubUrl}`}
            >
              <Github className="w-3.5 h-3.5 text-slate-300" />
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <button
              onClick={onOpenGithubModal}
              className="px-2 py-1.5 text-[11px] text-slate-400 hover:text-emerald-400 hover:bg-slate-800 border-l border-slate-700 transition"
              title="GitHub settings & clone commands"
            >
              Repo
            </button>
          </div>

          {/* Download standalone ready index.html button */}
          <a
            href={`${apiBase}/api/download-singlefile-html`}
            download="index.html"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            title="Download ready-to-upload single-file index.html for GitHub Pages"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ready index.html</span>
          </a>

          {/* Download full project ZIP button */}
          <a
            href={`${apiBase}/api/download-zip`}
            download="stock-ath-nifty500-analyzer.zip"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 transition"
            title="Download full project code as .zip for GitHub"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Project .zip</span>
          </a>

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
