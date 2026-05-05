"use client";

import type { HistoryPoint } from "@/lib/types";

interface Props {
  points: HistoryPoint[];
  /** Slice last N days for the sub-vis. Defaults to 60. */
  days?: number;
}

/**
 * Sub-visualization that pairs with the dial: 60-day net-flow sparkline
 * with a midline. Bars above the line = net buying, below = net selling.
 */
export function NetFlowSpark({ points, days = 60 }: Props) {
  if (!points.length) return null;
  const slice = points.slice(-days);
  const w = 420;
  const h = 56;
  const pad = 4;
  const max = Math.max(1, ...slice.map((p) => Math.abs(p.netDollars)));
  const barW = (w - pad * 2) / slice.length;

  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-fg-subtle font-mono mb-1.5">
        <span>Net flow · last 60 days</span>
        <span>buy / sell $</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-label="Net insider buy/sell flow, last 60 days">
        <line x1={pad} x2={w - pad} y1={h / 2} y2={h / 2} stroke="rgb(var(--border))" strokeWidth={1} strokeDasharray="2 3" />
        {slice.map((p, i) => {
          const x = pad + i * barW;
          const ratio = p.netDollars / max;
          const barH = Math.abs(ratio) * (h / 2 - 4);
          const y = p.netDollars >= 0 ? h / 2 - barH : h / 2;
          const fill = p.netDollars >= 0
            ? "rgb(var(--emerald))"
            : "rgb(var(--crimson))";
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(1, barW - 1)}
              height={Math.max(1, barH)}
              fill={fill}
              opacity="0.85"
              rx={1}
            />
          );
        })}
      </svg>
    </div>
  );
}
