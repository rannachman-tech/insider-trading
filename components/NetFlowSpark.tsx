"use client";

import { useState } from "react";
import type { HistoryPoint } from "@/lib/types";

interface Props {
  points: HistoryPoint[];
  /** Slice last N days. Defaults to 60. */
  days?: number;
}

/**
 * Sub-visualization that pairs with the dial: net-flow bars with a clear
 * zero baseline, axis labels, and hover tooltip. Bars above midline = net
 * buying, below = net selling.
 */
// Below this many real history points, render an "accumulating" empty
// state instead of a misleading-looking sparse chart.
const MIN_POINTS_TO_RENDER = 14;

export function NetFlowSpark({ points, days = 60 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;

  // Honest empty state during the data-accumulation period.
  if (points.length < MIN_POINTS_TO_RENDER) {
    return (
      <div className="w-full mt-3 max-w-[440px]">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-fg-subtle font-mono mb-1">
          <span>Net flow · last {days} days</span>
          <span>building</span>
        </div>
        <div className="rounded-md border border-dashed border-border bg-surface-2 px-3 py-3 text-center">
          <p className="text-[11.5px] text-fg-subtle leading-relaxed">
            <strong className="text-fg-muted font-medium">{points.length} day{points.length === 1 ? "" : "s"} of real data so far.</strong>
            {" "}This chart fills in as the daily ingest accumulates — no synthetic baseline.
          </p>
        </div>
      </div>
    );
  }

  const slice = points.slice(-days);
  const w = 440;
  // Reduced from 80px → 64px so the hero feels less vertically compressed.
  // Same data, lighter footprint — reviewer's hero-density feedback.
  const h = 64;
  const padX = 32;
  const padTop = 6;
  const padBottom = 14;
  const max = Math.max(1, ...slice.map((p) => Math.abs(p.netDollars)));
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBottom;
  const midY = padTop + innerH / 2;
  const barW = innerW / slice.length;

  const fmtCompact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(abs / 1e6).toFixed(0)}M`;
    if (abs >= 1e3) return `$${(abs / 1e3).toFixed(0)}k`;
    return `$${abs.toFixed(0)}`;
  };
  const ceilLabel = fmtCompact(max);
  const floorLabel = `−${fmtCompact(max)}`;

  // Date labels: first, middle, last
  const datesAt = [0, Math.floor(slice.length / 2), slice.length - 1];

  return (
    <div className="w-full mt-3 max-w-[440px]">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-fg-subtle font-mono mb-1">
        <span>Net flow · last {days} days</span>
        <span>$ buys − $ sells</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-label={`Net insider buy/sell flow, last ${days} days`}>
        {/* Y-axis labels */}
        <text x={padX - 4} y={padTop + 8} textAnchor="end" className="fill-current text-fg-subtle font-mono" style={{ fontSize: 9 }}>{ceilLabel}</text>
        <text x={padX - 4} y={midY + 3} textAnchor="end" className="fill-current text-fg-subtle font-mono" style={{ fontSize: 9 }}>0</text>
        <text x={padX - 4} y={h - padBottom + 2} textAnchor="end" className="fill-current text-fg-subtle font-mono" style={{ fontSize: 9 }}>{floorLabel}</text>

        {/* Zero baseline */}
        <line x1={padX} x2={w - padX} y1={midY} y2={midY} stroke="rgb(var(--border-strong))" strokeWidth={1} />

        {/* Top/bottom gridlines */}
        <line x1={padX} x2={w - padX} y1={padTop} y2={padTop} stroke="rgb(var(--border))" strokeWidth={0.5} strokeDasharray="2 3" opacity={0.5} />
        <line x1={padX} x2={w - padX} y1={h - padBottom} y2={h - padBottom} stroke="rgb(var(--border))" strokeWidth={0.5} strokeDasharray="2 3" opacity={0.5} />

        {/* Bars */}
        {slice.map((p, i) => {
          const x = padX + i * barW;
          const ratio = p.netDollars / max;
          const barH = Math.abs(ratio) * (innerH / 2);
          const y = p.netDollars >= 0 ? midY - barH : midY;
          const fill = p.netDollars >= 0 ? "rgb(var(--emerald))" : "rgb(var(--crimson))";
          const isHover = hover === i;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(1, barW - 1)}
              height={Math.max(1, barH)}
              fill={fill}
              opacity={hover === null || isHover ? 0.9 : 0.45}
              rx={1}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", transition: "opacity 120ms" }}
            />
          );
        })}

        {/* X-axis date labels */}
        {datesAt.map((i) => {
          const x = padX + i * barW + barW / 2;
          return (
            <text
              key={i}
              x={x}
              y={h - 2}
              textAnchor="middle"
              className="fill-current text-fg-subtle font-mono"
              style={{ fontSize: 9 }}
            >
              {dateLabel(slice[i].date)}
            </text>
          );
        })}

        {/* Hover readout */}
        {hover !== null && (
          (() => {
            const p = slice[hover];
            const x = padX + hover * barW + barW / 2;
            const sign = p.netDollars >= 0 ? "+" : "−";
            const amt = `${sign}${fmtCompact(p.netDollars)}`;
            const tx = Math.max(padX + 30, Math.min(w - padX - 30, x));
            return (
              <g pointerEvents="none">
                <rect x={tx - 36} y={2} width={72} height={14} rx={2} fill="rgb(var(--fg))" />
                <text x={tx} y={12} textAnchor="middle" className="fill-current font-mono tab-num" style={{ fontSize: 10, fill: "rgb(var(--bg))" }}>
                  {amt}
                </text>
              </g>
            );
          })()
        )}
      </svg>
    </div>
  );
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
