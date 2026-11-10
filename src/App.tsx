import React, { useState, useEffect } from 'react';
import { StockAnalysisData } from './types';
import { Header } from './components/Header';
import { TickerSearch } from './components/TickerSearch';
import { StockHeaderBlock } from './components/StockHeaderBlock';
import { InstitutionalScorecard } from './components/InstitutionalScorecard';
import { SummaryBlock } from './components/SummaryBlock';
import { LifetimeTripleChart } from './components/LifetimeTripleChart';
import { PatBarChart } from './components/PatBarChart';
import { LastMonthChart } from './components/LastMonthChart';
import { DataTableModal } from './components/DataTableModal';
import { GitHubModal } from './components/GitHubModal';
import {
  AlertCircle,
  RefreshCw,
  Table,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Github,
  WifiOff,
  BarChart4,
  Layers,
} from 'lucide-react';

const DEFAULT_GITHUB_URL = 'https://github.com/souravb1980/STOCKS';
const CLOUD_API_BASE = 'https://ais-pre-qvyj3tcy3bbsptuy27dqz2-263654441402.asia-southeast1.run.app';

export function getApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    return CLOUD_API_BASE;
  }
  return '';
}

function getSafeStorage(key: string, fallback: string): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || fallback;
    }
  } catch {
    // Storage access may be blocked in cross-origin iframes
  }
  return fallback;
}

function setSafeStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore restricted iframe storage errors
  }
}

export default function App() {
  const [ticker, setTicker] = useState<string>('RADICO.NS');
  const [data, setData] = useState<StockAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [valueMigrationScore, setValueMigrationScore] = useState<number>(3);

  // GitHub URL and modal state safely initialized
  const [githubUrl, setGithubUrl] = useState<string>(() =>
    getSafeStorage('stock_analyzer_github_url', DEFAULT_GITHUB_URL)
  );
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);

  // Modals
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);

  // Safe online status
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsOnline(navigator.onLine);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const fetchData = async (sym: string, vmScore?: number) => {
    setIsLoading(true);
    setError(null);
    const vmParam = vmScore !== undefined ? vmScore : valueMigrationScore;
    const apiBase = getApiBase();
    try {
      const res = await fetch(
        `${apiBase}/api/analyze?ticker=${encodeURIComponent(sym)}&valueMigration=${vmParam}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to fetch data for ${sym} (HTTP ${res.status})`);
      }
      const json: StockAnalysisData = await res.json();
      setData(json);
      setTicker(json.ticker);
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setError(err.message || 'An unexpected error occurred while fetching analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(ticker);
  }, []);

  const handleSelectTicker = (newTicker: string) => {
    fetchData(newTicker, valueMigrationScore);
  };

  const handleUpdateValueMigration = (newScore: number) => {
    setValueMigrationScore(newScore);
    fetchData(ticker, newScore);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Offline banner if disconnected */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Showing cached data. Reconnect to fetch latest market quotes.</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentTicker={ticker}
        githubUrl={githubUrl}
        onOpenGithubModal={() => setIsGithubModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Ticker Symbol Control (Primary user input) */}
        <section>
          <TickerSearch
            currentTicker={ticker}
            onSelectTicker={handleSelectTicker}
            isLoading={isLoading}
          />
        </section>

        {/* Error State */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-4 flex items-start gap-3 text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold">Analysis Failed</h3>
              <p className="text-xs text-rose-300">{error}</p>
              <button
                onClick={() => fetchData(ticker)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold text-white transition"
              >
                <RefreshCw className="w-3 h-3" /> Retry Analysis
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !data && (
          <div className="space-y-4">
            <div className="h-44 bg-slate-900 rounded-2xl animate-pulse"></div>
            <div className="h-32 bg-slate-900 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
              <div className="h-28 bg-slate-900 rounded-xl"></div>
              <div className="h-28 bg-slate-900 rounded-xl"></div>
              <div className="h-28 bg-slate-900 rounded-xl"></div>
            </div>
          </div>
        )}

        {/* Loaded Content */}
        {data && (
          <>
            {/* ========================================================= */}
            {/* 1. STOCK PRICE & PERFORMANCE HEADER BLOCK (Google Finance / Chart style) */}
            {/* ========================================================= */}
            <section>
              <StockHeaderBlock
                headerInfo={data.headerInfo}
                technical={data.technical}
              />
            </section>

            {/* ========================================================= */}
            {/* 2. INSTITUTIONAL FUNDAMENTAL & TECHNICAL SCORECARD & RECOMMENDATION */}
            {/* ========================================================= */}
            <section>
              <InstitutionalScorecard
                data={data}
                onUpdateValueMigration={handleUpdateValueMigration}
              />
            </section>

            {/* ========================================================= */}
            {/* 3. TECHNICAL SUMMARY & PYTHON OUTPUT BANNER */}
            {/* ========================================================= */}
            <section>
              <SummaryBlock data={data} />
            </section>

            {/* Quick Action Tools Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 px-4 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-mono">
                <span className="text-slate-400">Total Observations:</span>
                <span className="font-bold text-white">{data.totalTradingDays} trading days</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Baseline Start:</span>
                <span className="text-slate-200">{data.startDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDataModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <Table className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Inspect Raw Data Table</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 4. FIGURE 1: 3 STACKED LIFETIME CHARTS (Price, Returns, Diff) */}
            {/* ========================================================= */}
            <section>
              <LifetimeTripleChart data={data} />
            </section>

            {/* ========================================================= */}
            {/* 5. FIGURES 2 & 3: PAT Window and 1-Month Outperformance */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Figure 2: PAT Window */}
              <section>
                <PatBarChart data={data} />
              </section>

              {/* Figure 3: 1 Month Outperformance */}
              <section>
                <LastMonthChart data={data} />
              </section>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/80 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-emerald-400 font-bold">Stock ATH & Institutional Analyzer</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">11 Fundamentals + 4 Technical Criteria • Buy/Hold/Exit Matrix</span>
          </div>
          <div className="flex items-center gap-3 font-mono flex-wrap justify-center sm:justify-end">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition"
              title={`Visit GitHub site: ${githubUrl}`}
            >
              <Github className="w-3.5 h-3.5 text-slate-300" />
              <span>GitHub Site Link</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <button
              onClick={() => setIsGithubModalOpen(true)}
              className="text-xs text-slate-400 hover:text-emerald-400 underline transition cursor-pointer"
              title="View repository clone and push guide"
            >
              Repo Guide
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold uppercase tracking-wider">
              COPYRIGHT Sourav Kumar Bhowmick
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">All Rights Reserved</span>
          </div>
        </div>
      </footer>

      {/* Raw Data Table Modal */}
      {data && (
        <DataTableModal
          isOpen={isDataModalOpen}
          onClose={() => setIsDataModalOpen(false)}
          data={data}
        />
      )}

      {/* GitHub Repository & Link Modal */}
      <GitHubModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        githubUrl={githubUrl}
        onUpdateGithubUrl={(newUrl) => {
          setGithubUrl(newUrl);
          setSafeStorage('stock_analyzer_github_url', newUrl);
        }}
      />
    </div>
  );
}
