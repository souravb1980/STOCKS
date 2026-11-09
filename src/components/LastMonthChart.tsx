import React, { useState, useRef } from 'react';
import { StockAnalysisData } from '../types';
import { Calendar, Crosshair, TrendingUp } from 'lucide-react';

interface LastMonthChartProps {
  data: StockAnalysisData;
}

export const LastMonthChart: React.FC<LastMonthChartProps> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const series = data.lastMonth.series;
  if (!series || series.length === 0) {
    return null;
  }

  const N = series.length;
  const width = 850;
  const height = 320;
  const padLeft = 70;
  const padRight = 45;
  const padTop = 38;
  const padBottom = 45;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const getX = (i: number) => padLeft + (i / Math.max(1, N - 1)) * plotWidth;

  const diffValues = series.map((d) => d.diff);
  const minDiff = Math.min(0, ...diffValues);
  const maxDiff = Math.max(0, ...diffValues);
  const margin = Math.max(2, (maxDiff - minDiff) * 0.18);
  const minPadded = minDiff - margin;
  const maxPadded = maxDiff + margin;

  const getY = (val: number) => {
    const norm = (val - minPadded) / (maxPadded - minPadded || 1);
    return padTop + plotHeight - norm * plotHeight;
  };

  let topIdx = 0;
  let topVal = -Infinity;
  for (let i = 0; i < N; i++) {
    if (series[i].diff > topVal) {
      topVal = series[i].diff;
      topIdx = i;
    }
  }

  const topPoint = series[topIdx];
  const latestPoint = series[N - 1];

  const linePath = series
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.diff).toFixed(1)}`)
    .join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || N === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(padLeft, Math.min(width - padRight, mouseX));
    const ratio = (clampedX - padLeft) / plotWidth;
    const idx = Math.min(N - 1, Math.max(0, Math.round(ratio * (N - 1))));
    setHoverIdx(idx);
  };

  const activePt = hoverIdx !== null ? series[hoverIdx] : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 backdrop-blur">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
            Figure 3: Stock minus Nifty 500 (pp) — Last 1 Month
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {data.ticker} vs Nifty 500 ({data.lastMonth.startDate} to {data.lastMonth.endDate})
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-slate-400">1-Month Top</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span className="text-slate-400">Latest</span>
          </div>
        </div>
      </div>

      {/* Hover Status */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 px-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono min-h-[34px]">
        {activePt ? (
          <>
            <span className="text-slate-400">
              Date: <span className="text-white font-bold">{activePt.date}</span>
            </span>
            <span className="text-slate-400">
              Close: <span className="text-amber-400 font-bold">₹{activePt.stockPrice.toFixed(2)}</span>
            </span>
            <span className="text-slate-400">
              Difference:{' '}
              <span className={`font-bold ${activePt.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activePt.diff >= 0 ? '+' : ''}{activePt.diff.toFixed(1)} pp
              </span>
            </span>
          </>
        ) : (
          <span className="text-slate-400 italic">
            Top: {topVal.toFixed(1)} pp ({topPoint.date}) • Latest: {latestPoint.diff.toFixed(1)} pp
          </span>
        )}
      </div>

      {/* SVG Plot */}
      <div className="w-full overflow-x-auto bg-[#0b0f19] rounded-xl border border-slate-800/80 p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Plot Background */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotWidth}
            height={plotHeight}
            fill="#0b0f19"
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* Horizontal Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const val = minPadded + pct * (maxPadded - minPadded);
            const yPos = getY(val);
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
                  {val >= 0 ? '+' : ''}{val.toFixed(1)} pp
                </text>
              </g>
            );
          })}

          {/* 0 horizontal baseline */}
          <line
            x1={padLeft}
            y1={getY(0)}
            x2={width - padRight}
            y2={getY(0)}
            stroke="#475569"
            strokeWidth="1.2"
          />

          {/* 1-Month Difference Line (Green) */}
          <path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Individual Data Points */}
          {series.map((pt, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(pt.diff)}
              r="3.5"
              fill="#10b981"
              stroke="#0b0f19"
              strokeWidth="1.2"
            />
          ))}

          {/* Top of Month Marker & Line (Blue, -.) */}
          {topPoint && (
            <g>
              <line
                x1={padLeft}
                y1={getY(topPoint.diff)}
                x2={width - padRight}
                y2={getY(topPoint.diff)}
                stroke="#3b82f6"
                strokeWidth="1.2"
                strokeDasharray="6 3"
              />
              <circle
                cx={getX(topIdx)}
                cy={getY(topPoint.diff)}
                r="6"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <g
                transform={`translate(${Math.max(padLeft + 120, getX(topIdx) - 15)}, ${Math.max(
                  padTop + 20,
                  getY(topPoint.diff) - 12
                )})`}
              >
                <rect
                  x="-135"
                  y="-14"
                  width="135"
                  height="20"
                  rx="4"
                  fill="#0f172a"
                  stroke="#3b82f6"
                  strokeWidth="1.2"
                />
                <text
                  x="-67"
                  y="0"
                  fill="#60a5fa"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Top: {topPoint.diff.toFixed(1)} pp ({topPoint.date})
                </text>
              </g>
            </g>
          )}

          {/* Latest Point Marker (Red) */}
          {latestPoint && (
            <g>
              <circle
                cx={getX(N - 1)}
                cy={getY(latestPoint.diff)}
                r="6"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <g
                transform={`translate(${getX(N - 1) - 10}, ${Math.min(
                  padTop + plotHeight - 15,
                  getY(latestPoint.diff) + 24
                )})`}
              >
                <rect
                  x="-95"
                  y="-14"
                  width="95"
                  height="20"
                  rx="4"
                  fill="#0f172a"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                />
                <text
                  x="-47"
                  y="0"
                  fill="#f87171"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Latest: {latestPoint.diff.toFixed(1)} pp
                </text>
              </g>
            </g>
          )}

          {/* Hover Crosshair cursor */}
          {hoverIdx !== null && activePt && (
            <g>
              <line
                x1={getX(hoverIdx)}
                y1={padTop}
                x2={getX(hoverIdx)}
                y2={padTop + plotHeight}
                stroke="#dc2626"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <line
                x1={padLeft}
                y1={getY(activePt.diff)}
                x2={width - padRight}
                y2={getY(activePt.diff)}
                stroke="#dc2626"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <circle
                cx={getX(hoverIdx)}
                cy={getY(activePt.diff)}
                r="6"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Dates */}
          {series.map((d, i) => {
            if (i % Math.max(1, Math.floor(N / 6)) === 0 || i === N - 1) {
              const xPos = getX(i);
              return (
                <g key={i}>
                  <line
                    x1={xPos}
                    y1={padTop + plotHeight}
                    x2={xPos}
                    y2={padTop + plotHeight + 5}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={xPos}
                    y={padTop + plotHeight + 18}
                    fill="#64748b"
                    fontSize="9.5"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {d.date.substring(5)}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Y-Axis Label */}
          <text
            x={-height / 2}
            y="20"
            fill="#64748b"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="middle"
            transform="rotate(-90)"
          >
            Difference (pp)
          </text>
        </svg>
      </div>
    </div>
  );
};
