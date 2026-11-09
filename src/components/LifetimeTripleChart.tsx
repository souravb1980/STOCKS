import React, { useState, useRef, useMemo } from 'react';
import { StockAnalysisData, TimeseriesPoint, PeakPoint } from '../types';
import { Calendar, Crosshair, ZoomIn, Info } from 'lucide-react';

interface LifetimeTripleChartProps {
  data: StockAnalysisData;
}

export const LifetimeTripleChart: React.FC<LifetimeTripleChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<'ALL' | '5Y' | '1Y' | '6M'>('ALL');
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter timeseries by range
  const filteredData = useMemo(() => {
    if (selectedRange === 'ALL' || data.timeseries.length === 0) {
      return data.timeseries;
    }
    const lastDate = new Date(data.timeseries[data.timeseries.length - 1].date);
    const cutDate = new Date(lastDate);
    if (selectedRange === '5Y') cutDate.setFullYear(lastDate.getFullYear() - 5);
    else if (selectedRange === '1Y') cutDate.setFullYear(lastDate.getFullYear() - 1);
    else if (selectedRange === '6M') cutDate.setMonth(lastDate.getMonth() - 6);

    const cutStr = cutDate.toISOString().split('T')[0];
    const subset = data.timeseries.filter((d) => d.date >= cutStr);
    return subset.length > 5 ? subset : data.timeseries;
  }, [data.timeseries, selectedRange]);

  // Recalculate peaks within view
  const { topPeaksPrice, topPeaksDiff } = useMemo(() => {
    if (selectedRange === 'ALL') {
      return {
        topPeaksPrice: data.peaks.stockPrice,
        topPeaksDiff: data.peaks.diff,
      };
    }
    const sortedP = [...filteredData].sort((a, b) => b.stockPrice - a.stockPrice);
    const sortedD = [...filteredData].sort((a, b) => b.diff - a.diff);
    return {
      topPeaksPrice: sortedP.slice(0, 3).map((p, idx) => ({
        date: p.date,
        value: p.stockPrice,
        index: filteredData.indexOf(p),
        rank: idx + 1,
      })),
      topPeaksDiff: sortedD.slice(0, 3).map((p, idx) => ({
        date: p.date,
        value: p.diff,
        index: filteredData.indexOf(p),
        rank: idx + 1,
      })),
    };
  }, [filteredData, selectedRange, data.peaks]);

  // Dimensions
  const width = 1100;
  const panelHeight = 220;
  const gap = 38;
  const padLeft = 85;
  const padRight = 35;
  const padTop = 32;
  const padBottom = 28;

  const totalHeight = padTop + (panelHeight * 3) + (gap * 2) + padBottom;
  const plotWidth = width - padLeft - padRight;

  const N = filteredData.length;
  const getX = (index: number) => padLeft + (index / Math.max(1, N - 1)) * plotWidth;

  // Panel 1: Price
  const minPrice = Math.min(...filteredData.map((d) => d.stockPrice)) * 0.9;
  const maxPrice = Math.max(...filteredData.map((d) => d.stockPrice)) * 1.1;
  const getY1 = (val: number) => {
    const norm = (val - minPrice) / (maxPrice - minPrice || 1);
    return padTop + panelHeight - norm * panelHeight;
  };

  // Panel 2: Cumulative Return (%)
  const minRet = Math.min(...filteredData.flatMap((d) => [d.stockReturn, d.indexReturn]));
  const maxRet = Math.max(...filteredData.flatMap((d) => [d.stockReturn, d.indexReturn]));
  const retMargin = Math.max(10, (maxRet - minRet) * 0.1);
  const minRetPadded = minRet - retMargin;
  const maxRetPadded = maxRet + retMargin;
  const panel2Top = padTop + panelHeight + gap;
  const getY2 = (val: number) => {
    const norm = (val - minRetPadded) / (maxRetPadded - minRetPadded || 1);
    return panel2Top + panelHeight - norm * panelHeight;
  };

  // Panel 3: Difference (pp)
  const minDiff = Math.min(0, ...filteredData.map((d) => d.diff));
  const maxDiff = Math.max(0, ...filteredData.map((d) => d.diff));
  const diffMargin = Math.max(5, (maxDiff - minDiff) * 0.12);
  const minDiffPadded = minDiff - diffMargin;
  const maxDiffPadded = maxDiff + diffMargin;
  const panel3Top = panel2Top + panelHeight + gap;
  const getY3 = (val: number) => {
    const norm = (val - minDiffPadded) / (maxDiffPadded - minDiffPadded || 1);
    return panel3Top + panelHeight - norm * panelHeight;
  };

  // SVG Paths
  const pricePath = filteredData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY1(d.stockPrice).toFixed(1)}`)
    .join(' ');

  const stockRetPath = filteredData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY2(d.stockReturn).toFixed(1)}`)
    .join(' ');

  const indexRetPath = filteredData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY2(d.indexReturn).toFixed(1)}`)
    .join(' ');

  const diffPath = filteredData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY3(d.diff).toFixed(1)}`)
    .join(' ');

  // X Axis Ticks (Dates)
  const xTicks = useMemo(() => {
    if (N < 2) return [];
    const step = Math.max(1, Math.floor(N / 8));
    const ticks: { index: number; x: number; label: string }[] = [];
    for (let i = 0; i < N; i += step) {
      ticks.push({
        index: i,
        x: getX(i),
        label: filteredData[i].date.substring(0, 7),
      });
    }
    if (ticks[ticks.length - 1].index !== N - 1) {
      ticks.push({
        index: N - 1,
        x: getX(N - 1),
        label: filteredData[N - 1].date.substring(0, 7),
      });
    }
    return ticks;
  }, [N, filteredData]);

  // Peak styling constants matching python script
  const peakStyles = [
    { color: '#2563eb', dash: '6 4', label: 'Top 1' },
    { color: '#7c3aed', dash: '4 4', label: 'Top 2' },
    { color: '#0d9488', dash: '2 2', label: 'Top 3' },
  ];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || N === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(padLeft, Math.min(width - padRight, mouseX));
    const ratio = (clampedX - padLeft) / plotWidth;
    const idx = Math.min(N - 1, Math.max(0, Math.round(ratio * (N - 1))));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? filteredData[hoverIndex] : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 backdrop-blur">
      {/* Chart Title & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Figure 1: Lifetime Technical & Benchmark Comparison
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
              3 Synchronized Axes
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Hover cursor moves across all 3 graphs simultaneously • Top 3 peaks calculated via 6-month isolation window
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {(['ALL', '5Y', '1Y', '6M'] as const).map((rng) => (
            <button
              key={rng}
              onClick={() => setSelectedRange(rng)}
              className={`px-3 py-1 rounded-lg transition font-bold ${
                selectedRange === rng
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {rng === 'ALL' ? 'Lifetime' : rng}
            </button>
          ))}
        </div>
      </div>

      {/* Synchronized Hover HUD Inspector */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 px-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {activePoint ? (
          <>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date:</span>
              <span className="font-bold text-white">{activePoint.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Close:</span>
              <span className="font-bold text-amber-400">
                ₹{activePoint.stockPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{data.ticker}:</span>
              <span className={`font-bold ${activePoint.stockReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activePoint.stockReturn >= 0 ? '+' : ''}{activePoint.stockReturn.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Nifty 500:</span>
              <span className={`font-bold ${activePoint.indexReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activePoint.indexReturn >= 0 ? '+' : ''}{activePoint.indexReturn.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Difference:</span>
              <span className={`font-bold ${activePoint.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activePoint.diff >= 0 ? '+' : ''}{activePoint.diff.toFixed(1)} pp
              </span>
            </div>
          </>
        ) : (
          <div className="text-slate-400 flex items-center gap-2 italic py-0.5">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>Move cursor over the chart to inspect crosshair readings across all 3 panels</span>
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div className="w-full overflow-x-auto bg-[#0b0f19] rounded-xl border border-slate-800/80 p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${totalHeight}`}
          className="w-full h-auto cursor-crosshair select-none block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* ======================================================== */}
          {/* PANEL 1: Stock Closing Price (₹) - Lifetime */}
          {/* ======================================================== */}
          <g>
            <rect
              x={padLeft}
              y={padTop}
              width={plotWidth}
              height={panelHeight}
              fill="#0b0f19"
              stroke="#1e293b"
              strokeWidth="1"
            />

            {/* Title & Legend */}
            <text
              x={padLeft + 12}
              y={padTop + 18}
              fill="#f8fafc"
              fontSize="12"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {data.ticker} closing price (₹) - {selectedRange === 'ALL' ? 'lifetime' : selectedRange}
            </text>

            <g transform={`translate(${width - padRight - 150}, ${padTop + 12})`}>
              <line x1="0" y1="6" x2="20" y2="6" stroke="#ea580c" strokeWidth="2.5" />
              <text x="26" y="10" fill="#fb923c" fontSize="11" fontFamily="monospace" fontWeight="bold">
                {data.ticker} close
              </text>
            </g>

            {/* Horizontal Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = minPrice + pct * (maxPrice - minPrice);
              const yPos = getY1(yVal);
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={width - padRight}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={yPos + 4}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    ₹{Math.round(yVal).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Price Line */}
            <path
              d={pricePath}
              fill="none"
              stroke="#ea580c"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* Top 3 Peaks Markers on Price */}
            {topPeaksPrice.map((peak, idx) => {
              const style = peakStyles[idx] || peakStyles[0];
              const yPos = getY1(peak.value);
              const xPos = getX(peak.index);
              return (
                <g key={`p-peak-${idx}`}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={width - padRight}
                    y2={yPos}
                    stroke={style.color}
                    strokeWidth="1.2"
                    strokeDasharray={style.dash}
                  />
                  <circle cx={xPos} cy={yPos} r="4.5" fill={style.color} stroke="#ffffff" strokeWidth="1.5" />
                  <g transform={`translate(${Math.max(padLeft + 120, xPos - 15)}, ${Math.max(padTop + 24, yPos - 12)})`}>
                    <rect
                      x="-140"
                      y="-14"
                      width="140"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke={style.color}
                      strokeWidth="1.2"
                    />
                    <text
                      x="-70"
                      y="0"
                      fill={style.color}
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {style.label}: ₹{peak.value.toFixed(1)} ({peak.date})
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* PANEL 2: Cumulative Return (%) - Lifetime */}
          {/* ======================================================== */}
          <g>
            <rect
              x={padLeft}
              y={panel2Top}
              width={plotWidth}
              height={panelHeight}
              fill="#0b0f19"
              stroke="#1e293b"
              strokeWidth="1"
            />

            <text
              x={padLeft + 12}
              y={panel2Top + 18}
              fill="#f8fafc"
              fontSize="12"
              fontWeight="bold"
              fontFamily="monospace"
            >
              Cumulative return (%) - {selectedRange === 'ALL' ? 'lifetime' : selectedRange}
            </text>

            <g transform={`translate(${padLeft + 16}, ${panel2Top + 34})`}>
              <line x1="0" y1="4" x2="16" y2="4" stroke="#2563eb" strokeWidth="2.5" />
              <text x="22" y="8" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {data.ticker}
              </text>
              <line x1="120" y1="4" x2="136" y2="4" stroke="#ca8a04" strokeWidth="2" strokeDasharray="3 3" />
              <text x="142" y="8" fill="#facc15" fontSize="10" fontFamily="monospace" fontWeight="semibold">
                Nifty 500 (^CRSLDX)
              </text>
            </g>

            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = minRetPadded + pct * (maxRetPadded - minRetPadded);
              const yPos = getY2(yVal);
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={width - padRight}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={yPos + 4}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {yVal >= 0 ? '+' : ''}{Math.round(yVal)}%
                  </text>
                </g>
              );
            })}

            {/* 0 baseline */}
            {minRetPadded <= 0 && maxRetPadded >= 0 && (
              <line
                x1={padLeft}
                y1={getY2(0)}
                x2={width - padRight}
                y2={getY2(0)}
                stroke="#475569"
                strokeWidth="1.2"
              />
            )}

            {/* Benchmark Return Line */}
            <path
              d={indexRetPath}
              fill="none"
              stroke="#ca8a04"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />

            {/* Stock Return Line */}
            <path
              d={stockRetPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>

          {/* ======================================================== */}
          {/* PANEL 3: Stock minus Nifty 500 (percentage points) */}
          {/* ======================================================== */}
          <g>
            <rect
              x={padLeft}
              y={panel3Top}
              width={plotWidth}
              height={panelHeight}
              fill="#0b0f19"
              stroke="#1e293b"
              strokeWidth="1"
            />

            <text
              x={padLeft + 12}
              y={panel3Top + 18}
              fill="#f8fafc"
              fontSize="12"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {data.ticker} minus Nifty 500 (percentage points pp)
            </text>

            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = minDiffPadded + pct * (maxDiffPadded - minDiffPadded);
              const yPos = getY3(yVal);
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={width - padRight}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={yPos + 4}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {yVal >= 0 ? '+' : ''}{yVal.toFixed(0)} pp
                  </text>
                </g>
              );
            })}

            {/* 0 line */}
            <line
              x1={padLeft}
              y1={getY3(0)}
              x2={width - padRight}
              y2={getY3(0)}
              stroke="#475569"
              strokeWidth="1.2"
            />

            {/* Difference Line (Green) */}
            <path
              d={diffPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* Top 3 Peaks Markers on Difference */}
            {topPeaksDiff.map((peak, idx) => {
              const style = peakStyles[idx] || peakStyles[0];
              const yPos = getY3(peak.value);
              const xPos = getX(peak.index);
              return (
                <g key={`d-peak-${idx}`}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={width - padRight}
                    y2={yPos}
                    stroke={style.color}
                    strokeWidth="1.2"
                    strokeDasharray={style.dash}
                  />
                  <circle cx={xPos} cy={yPos} r="4.5" fill={style.color} stroke="#ffffff" strokeWidth="1.5" />
                  <g transform={`translate(${Math.max(padLeft + 120, xPos - 15)}, ${Math.max(panel3Top + 24, yPos - 12)})`}>
                    <rect
                      x="-140"
                      y="-14"
                      width="140"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke={style.color}
                      strokeWidth="1.2"
                    />
                    <text
                      x="-70"
                      y="0"
                      fill={style.color}
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {style.label}: {peak.value.toFixed(1)} pp ({peak.date})
                    </text>
                  </g>
                </g>
              );
            })}

            {/* X-Axis Date Labels */}
            {xTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={t.x}
                  y1={panel3Top + panelHeight}
                  x2={t.x}
                  y2={panel3Top + panelHeight + 5}
                  stroke="#475569"
                  strokeWidth="1"
                />
                <text
                  x={t.x}
                  y={panel3Top + panelHeight + 18}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {t.label}
                </text>
              </g>
            ))}
          </g>

          {/* ======================================================== */}
          {/* SYNCHRONIZED RED CROSSHAIR DATA CURSOR */}
          {/* ======================================================== */}
          {hoverIndex !== null && activePoint && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padTop}
                x2={getX(hoverIndex)}
                y2={panel3Top + panelHeight}
                stroke="#dc2626"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />

              {/* Panel 1 Dot & Horizontal Follower */}
              <line
                x1={padLeft}
                y1={getY1(activePoint.stockPrice)}
                x2={width - padRight}
                y2={getY1(activePoint.stockPrice)}
                stroke="#dc2626"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY1(activePoint.stockPrice)}
                r="5"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <g transform={`translate(${width - padRight + 4}, ${getY1(activePoint.stockPrice)})`}>
                <rect x="0" y="-8" width="55" height="16" rx="3" fill="#dc2626" />
                <text x="27" y="4" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ₹{activePoint.stockPrice.toFixed(1)}
                </text>
              </g>

              {/* Panel 3 Dot & Horizontal Follower */}
              <line
                x1={padLeft}
                y1={getY3(activePoint.diff)}
                x2={width - padRight}
                y2={getY3(activePoint.diff)}
                stroke="#dc2626"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY3(activePoint.diff)}
                r="5"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <g transform={`translate(${width - padRight + 4}, ${getY3(activePoint.diff)})`}>
                <rect x="0" y="-8" width="48" height="16" rx="3" fill="#dc2626" />
                <text x="24" y="4" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  {activePoint.diff.toFixed(1)}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
