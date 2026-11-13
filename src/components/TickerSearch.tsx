import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Loader2, TrendingUp, Check, Sparkles } from 'lucide-react';

interface TickerSearchProps {
  currentTicker: string;
  onSelectTicker: (ticker: string) => void;
  isLoading: boolean;
}

export const POPULAR_TICKERS = [
  { symbol: 'RADICO.NS', name: 'Radico Khaitan' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Ind.' },
  { symbol: 'TCS.NS', name: 'TCS' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'ITC.NS', name: 'ITC Ltd' },
  { symbol: 'SBIN.NS', name: 'SBI' },
  { symbol: 'BHARTIARTL.NS', name: 'Airtel' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
  { symbol: 'TITAN.NS', name: 'Titan' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'DIXON.NS', name: 'Dixon Tech' },
  { symbol: 'ZOMATO.NS', name: 'Zomato' },
];

export const TickerSearch: React.FC<TickerSearchProps> = ({
  currentTicker,
  onSelectTicker,
  isLoading,
}) => {
  const [inputValue, setInputValue] = useState(currentTicker);
  const [suggestions, setSuggestions] = useState<
    { symbol: string; shortname: string; exchange: string }[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(currentTicker);
  }, [currentTicker]);

  useEffect(() => {
    const q = inputValue.trim().toUpperCase();
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }

    // Client-side local suggestion fallback first (instant on GitHub Pages)
    const localMatches = POPULAR_TICKERS.filter(
      (item) =>
        item.symbol.toUpperCase().includes(q) ||
        item.name.toUpperCase().includes(q)
    ).map((item) => ({
      symbol: item.symbol,
      shortname: item.name,
      exchange: 'NSE',
    }));

    if (localMatches.length > 0) {
      setSuggestions(localMatches);
    }

    // Background attempt to fetch live suggestions if backend is available
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setSuggestions(list);
          }
        }
      } catch {
        // silent fail on static hosting
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let val = inputValue.trim().toUpperCase();
    if (!val) return;
    if (!val.includes('.') && !val.startsWith('^')) {
      val = `${val}.NS`;
    }
    setIsOpen(false);
    onSelectTicker(val);
  };

  const handleSelectSuggestion = (symbol: string) => {
    setInputValue(symbol);
    setIsOpen(false);
    onSelectTicker(symbol);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Ticker Symbol:
          </label>
          <span className="text-xs text-slate-400 font-sans">
            Benchmark:{' '}
            <span className="text-emerald-400 font-mono font-semibold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              Nifty 500 (^CRSLDX)
            </span>
          </span>
        </div>

        {/* Input bar */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Type ticker (e.g. TCS, RELIANCE, INFY, TATAMOTORS, HDFCBANK)..."
              className="w-full bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white rounded-xl pl-10 pr-28 py-2.5 text-sm font-mono tracking-wide placeholder-slate-500 transition outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Autocomplete dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Matching Tickers
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => handleSelectSuggestion(item.symbol)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between transition group cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                      {item.symbol}
                    </span>
                    <span className="text-[11px] text-slate-300 truncate max-w-xs">
                      {item.shortname}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.exchange}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Popular Tickers Quick Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Quick select:
          </span>
          {POPULAR_TICKERS.map((stock) => {
            const isSelected = currentTicker === stock.symbol;
            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => handleSelectSuggestion(stock.symbol)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1 border cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500 font-bold shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80 hover:border-slate-600'
                }`}
                title={`Analyze ${stock.name} (${stock.symbol})`}
              >
                {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                <span>{stock.symbol.replace('.NS', '')}</span>
              </button>
            );
          })}
        </div>
      </form>
    </div>
  );
};
