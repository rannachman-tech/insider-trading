"use client";

import { useState } from "react";
import type { HistoryPoint } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface Props {
  history: HistoryPoint[];
  currentIndex: number;
}

const W = 1100;
const H = 240;
const PAD_X = 40;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;

export function HistoryChart({ history, currentIndex }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  if (!history.length) return null;

  // Compute percentile rank of currentIndex within the full series. This is
  // the framing the reviewer flagged as essential — "20th percentile of the
  // last year" is dramatically less alarming than "you're at 22 in a chart
  // with a giant red zone".
  const sorted = [...history.map((p) => p.index)].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= currentIndex);
  const percentile = sorted.length > 0
    ? Math.max(1, Math.min(99, Math.round(((rank < 0 ? sorted.length : rank) / sorted.length) * 100)))
    : 50;
  const yearMin = sorted[0] ?? currentIndex;
  const yearMax = sorted[sorted.length - 1] ?? currentIndex;
  const median = sorted[Math.floor(sorted.length / 2)] ?? currentIndex;

  // Need ~30 points before a 12-month chart reads as meaningful. Below
  // that we show an "accumulating" empty state — never synthetic data.
  if (history.length < 30) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5">
        <header className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-fg">12-month history</h2>
            <p className="mt-0.5 text-[12px] text-fg-subtle">
              Built from real daily ingests only — no synthetic data fills the gap.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono tab-num text-2xl font-semibold text-fg leading-none">{currentIndex}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">today</div>
          </div>
        </header>
        <div className="rounded-md border border-dashed border-border bg-surface-2 px-4 py-8 text-center">
          <p className="text-[13px] text-fg-muted leading-relaxed">
            <strong className="text-fg font-medium">{history.length} day{history.length === 1 ? "" : "s"} of real data accumulated so far.</strong>
            {" "}The chart needs about 30 days of history before percentile context becomes meaningful — keep checking back as the daily ingest fills it in.
          </p>
        </div>
      </section>
    );
  }

  const points = history;
  const xStep = (W - PAD_X * 2) / (points.length - 1);
  const yScale = (v: number) => PAD_TOP + ((100 - v) / 100) * (H - PAD_TOP - PAD_BOTTOM);

  const bands: Array<[number, number, string, string]> = [
    [70, 100, "rgb(var(--emerald) / 0.07)", "Heavy buying"],
    [40, 70, "rgb(var(--amber) / 0.06)", "Balanced"],
    [0, 40, "rgb(var(--crimson) / 0.07)", "Heavy selling"],
  ];

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(PAD_X + i * xStep).toFixed(2)} ${yScale(p.index).toFixed(2)}`)
    .join(" ");

  const fillPath =
    `M ${PAD_X.toFixed(2)} ${yScale(points[0].index).toFixed(2)} ` +
    points
      .slice(1)
      .map((p, i) => `L ${(PAD_X + (i + 1) * xStep).toFixed(2)} ${yScale(p.index).toFixed(2)}`)
      .join(" ") +
    ` L ${(PAD_X + (points.length - 1) * xStep).toFixed(2)} ${(H - PAD_BOTTOM).toFixed(2)} L ${PAD_X.toFixed(2)} ${(H - PAD_BOTTOM).toFixed(2)} Z`;

  const dateTicks = points
    .map((p, i) => ({ p, i }))
    .filter((_, i) => i === 0 || _.i % 60 === 0 || _.i === points.length - 1);

  function handleMove(evt: React.MouseEvent<SVGSVGElement>) {
    const rect = (evt.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(points.length - 1, Math.round((px - PAD_X) / xStep)));
    setHover(i);
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">12-month history</h2>
          <p className="mt-0.5 text-[12px] text-fg-subtle leading-relaxed">
            Today's reading is in the{" "}
            <strong className="text-fg font-mono tab-num">{ordinal(percentile)} percentile</strong>{" "}
            of the past year (range {yearMin}–{yearMax}, median {median}). Coloured bands show where each phase sits.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono tab-num text-2xl font-semibold text-fg leading-none">{currentIndex}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
            today
          </div>
        </div>
      </header>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          preserveAspectRatio="none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Phase bands */}
          {bands.map(([from, to, fill, label]) => (
            <g key={`${from}-${to}`}>
              <rect x={PAD_X} y={yScale(to)} width={W - PAD_X * 2} height={yScale(from) - yScale(to)} fill={fill} />
              <text
                x={W - PAD_X - 6}
                y={yScale(to) + 12}
                textAnchor="end"
                className="fill-current text-fg-subtle font-mono"
                style={{ fontSize: 9, letterSpacing: 0.5 }}
              >
                {label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Y-axis grid */}
          {[0, 40, 70, 100].map((g) => (
            <g key={g}>
              <line
                x1={PAD_X}
                y1={yScale(g)}
                x2={W - PAD_X}
                y2={yScale(g)}
                stroke="rgb(var(--border-strong))"
                strokeWidth={g === 40 || g === 70 ? 1 : 0.6}
                strokeDasharray={g === 0 || g === 100 ? "" : "3 4"}
                opacity={g === 40 || g === 70 ? 0.7 : 0.5}
              />
              <text x={PAD_X - 6} y={yScale(g) + 4} textAnchor="end" className="fill-current text-fg-subtle font-mono" style={{ fontSize: 10 }}>{g}</text>
            </g>
          ))}

          <defs>
            <linearGradient id="hist-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(var(--fg) / 0.18)" />
              <stop offset="100%" stopColor="rgb(var(--fg) / 0.0)" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#hist-fill)" />
          <path d={linePath} fill="none" stroke="rgb(var(--fg))" strokeWidth="1.6" />

          {dateTicks.map((t) => (
            <g key={t.i}>
              <line x1={PAD_X + t.i * xStep} y1={H - PAD_BOTTOM} x2={PAD_X + t.i * xStep} y2={H - PAD_BOTTOM + 4} stroke="rgb(var(--fg-subtle))" strokeWidth={1} />
              <text x={PAD_X + t.i * xStep} y={H - PAD_BOTTOM + 16} textAnchor="middle" className="fill-current text-fg-subtle font-mono" style={{ fontSize: 10 }}>
                {monthLabel(t.p.date)}
              </text>
            </g>
          ))}

          {/* Hover crosshair + readout */}
          {hover !== null && (
            (() => {
              const p = points[hover];
              const x = PAD_X + hover * xStep;
              const y = yScale(p.index);
              return (
                <g pointerEvents="none">
                  <line x1={x} x2={x} y1={PAD_TOP} y2={H - PAD_BOTTOM} stroke="rgb(var(--fg))" strokeWidth={0.7} strokeDasharray="2 3" opacity={0.6} />
                  <circle cx={x} cy={y} r="4" fill="rgb(var(--fg))" />
                  <g transform={`translate(${Math.min(W - 130, Math.max(PAD_X, x + 8))}, ${Math.max(PAD_TOP + 6, y - 24)})`}>
                    <rect width="120" height="36" rx="4" fill="rgb(var(--fg))" />
                    <text x="8" y="14" className="fill-current font-mono" style={{ fontSize: 10, fill: "rgb(var(--bg))" }}>
                      {formatDate(p.date, { withYear: true })}
                    </text>
                    <text x="8" y="28" className="fill-current font-mono tab-num font-semibold" style={{ fontSize: 12, fill: "rgb(var(--bg))" }}>
                      Index {p.index}
                    </text>
                  </g>
                </g>
              );
            })()
          )}

          {/* Final marker */}
          {(() => {
            const last = points[points.length - 1];
            const x = PAD_X + (points.length - 1) * xStep;
            const y = yScale(last.index);
            return (
              <g>
                <circle cx={x} cy={y} r="4" fill="rgb(var(--fg))" />
                <circle cx={x} cy={y} r="9" fill="rgb(var(--fg) / 0.15)" />
              </g>
            );
          })()}
        </svg>
      </div>
    </section>
  );
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
