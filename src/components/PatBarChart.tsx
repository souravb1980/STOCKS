import React, { useState } from 'react';
import { StockAnalysisData } from '../types';
import { Award, CheckCircle2, XCircle } from 'lucide-react';

interface PatBarChartProps {
  data: StockAnalysisData;
}

export const PatBarChart: React.FC<PatBarChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Construct bars
  const barsData: { label: string; value: number; isTtm: boolean; isAth: boolean }[] = [];

  for (let i = 0; i < data.pat.annual.length; i++) {
    const item = data.pat.annual[i];
    barsData.push({
      label: item.label,
      value: item.patCr,
      isTtm: false,
      isAth: false,
    });
  }

  if (data.pat.ttm != null) {
    barsData.push({
      label: 'TTM',
      value: data.pat.ttm,
      isTtm: true,
      isAth: data.pat.isAth,
    });
  } else if (barsData.length > 0) {
    barsData[barsData.length - 1].isAth = data.pat.isAth;
  }

  const athValue = data.pat.ath;
  const maxVal = Math.max(athValue, ...barsData.map((b) => b.value)) * 1.25;
  const minVal = Math.min(0, ...barsData.map((b) => b.value));

  // Dimensions
  const width = 850;
  const height = 320;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 45;
  const padBottom = 45;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const barCount = barsData.length;
  const barWidth = Math.min(65, (plotWidth / barCount) * 0.6);
  const step = plotWidth / barCount;

  const getY = (val: number) => {
    const norm = (val - minVal) / (maxVal - minVal || 1);
    return padTop + plotHeight - norm * plotHeight;
  };

  const athY = getY(athValue);

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 backdrop-blur">
      {/* Title with PAT status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Figure 2: Profit After Tax (₹ crore)
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 border ${
                data.pat.isAth
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-950/60 text-rose-400 border-rose-500/40'
              }`}
            >
              {data.pat.isAth ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AT ALL-TIME HIGH ✔</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>NOT at all-time high ✘</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {data.pat.statusText}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#4682b4]"></div>
            <span className="text-slate-400">Annual FY</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-sm ${
                data.pat.isAth ? 'bg-[#10b981]' : 'bg-[#ea580c]'
              }`}
            ></div>
            <span className="text-slate-400">TTM Bar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-[#3b82f6]"></div>
            <span className="text-slate-400">ATH Line</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="w-full overflow-x-auto bg-[#0b0f19] rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none block"
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

          {/* Horizontal Grid & Y-Axis values */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const val = minVal + pct * (maxVal - minVal);
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
                  ₹{Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {minVal < 0 && (
            <line
              x1={padLeft}
              y1={getY(0)}
              x2={width - padRight}
              y2={getY(0)}
              stroke="#475569"
              strokeWidth="1"
            />
          )}

          {/* ATH Horizontal Reference Line (Blue, -.) */}
          <line
            x1={padLeft}
            y1={athY}
            x2={width - padRight}
            y2={athY}
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          {/* ATH Annotation on the line */}
          <g transform={`translate(${padLeft + 12}, ${Math.max(padTop + 14, athY - 8)})`}>
            <rect
              x="0"
              y="-12"
              width="230"
              height="18"
              rx="3"
              fill="#0f172a"
              stroke="#3b82f6"
              strokeWidth="1.2"
            />
            <text
              x="8"
              y="1"
              fill="#60a5fa"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              All-time high PAT: ₹{Math.round(athValue).toLocaleString('en-IN')} cr ({data.pat.athLabel})
            </text>
          </g>

          {/* Bars */}
          {barsData.map((bar, idx) => {
            const centerX = padLeft + idx * step + step / 2;
            const barX = centerX - barWidth / 2;
            const barY = getY(Math.max(0, bar.value));
            const baseZeroY = getY(0);
            const bHeight = Math.abs(baseZeroY - getY(bar.value));

            let fillColor = '#4682b4'; // steelblue
            if (bar.isTtm || idx === barsData.length - 1) {
              fillColor = data.pat.isAth ? '#10b981' : '#ea580c';
            }

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-all"
              >
                {/* Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(2, bHeight)}
                  rx="3"
                  fill={fillColor}
                  stroke={isHovered ? '#ffffff' : 'none'}
                  strokeWidth={isHovered ? 1.5 : 0}
                  opacity={isHovered ? 1 : 0.85}
                />

                {/* Value annotation on top of bar */}
                <text
                  x={centerX}
                  y={barY - 6}
                  fill="#f1f5f9"
                  fontSize="10.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  ₹{Math.round(bar.value).toLocaleString('en-IN')}
                </text>

                {/* Label on X-axis (FY... or TTM) */}
                <text
                  x={centerX}
                  y={padTop + plotHeight + 18}
                  fill={bar.isTtm ? '#38bdf8' : '#94a3b8'}
                  fontSize="11"
                  fontWeight={bar.isTtm ? 'bold' : 'normal'}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {bar.label}
                </text>
              </g>
            );
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
            PAT (₹ crore)
          </text>
        </svg>
      </div>
    </div>
  );
};
