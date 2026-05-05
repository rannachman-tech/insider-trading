"use client";

import type { HistoryPoint } from "@/lib/types";

interface Props {
  history: HistoryPoint[];
  currentIndex: number;
}

const W = 1100;
const H = 220;
const PAD_X = 36;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;

export function HistoryChart({ history, currentIndex }: Props) {
  if (!history.length) return null;

  const points = history;
  const xStep = (W - PAD_X * 2) / (points.length - 1);
  const yScale = (v: number) => PAD_TOP + ((100 - v) / 100) * (H - PAD_TOP - PAD_BOTTOM);

  // Background bands: 0-40 crimson, 40-70 amber, 70-100 emerald
  const bands: Array<[number, number, string]> = [
    [70, 100, "rgb(var(--emerald) / 0.07)"],
    [40, 70, "rgb(var(--amber) / 0.06)"],
    [0, 40, "rgb(var(--crimson) / 0.07)"],
  ];

  // Line path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(PAD_X + i * xStep).toFixed(2)} ${yScale(p.index).toFixed(2)}`)
    .join(" ");

  // Fill path
  const fillPath =
    `M ${PAD_X.toFixed(2)} ${yScale(points[0].index).toFixed(2)} ` +
    points
      .slice(1)
      .map((p, i) => `L ${(PAD_X + (i + 1) * xStep).toFixed(2)} ${yScale(p.index).toFixed(2)}`)
      .join(" ") +
    ` L ${(PAD_X + (points.length - 1) * xStep).toFixed(2)} ${(H - PAD_BOTTOM).toFixed(2)} L ${PAD_X.toFixed(2)} ${(H - PAD_BOTTOM).toFixed(2)} Z`;

  // Date ticks: every 60 days
  const dateTicks = points
    .map((p, i) => ({ p, i }))
    .filter((_, i) => i === 0 || _.i % 60 === 0 || _.i === points.length - 1);

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-fg">12-month history</h2>
          <p className="mt-0.5 text-[12px] text-fg-subtle">
            Insider Conviction Index, daily. Bands mark the three phases.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono tab-num text-2xl font-semibold text-fg">{currentIndex}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
            today
          </div>
        </div>
      </header>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
          {bands.map(([from, to, fill]) => (
            <rect
              key={`${from}-${to}`}
              x={PAD_X}
              y={yScale(to)}
              width={W - PAD_X * 2}
              height={yScale(from) - yScale(to)}
              fill={fill}
            />
          ))}

          {/* Grid lines at 0, 25, 50, 75, 100 */}
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line
                x1={PAD_X}
                y1={yScale(g)}
                x2={W - PAD_X}
                y2={yScale(g)}
                stroke="rgb(var(--border))"
                strokeWidth={g === 50 ? 1.5 : 1}
                strokeDasharray={g === 50 ? "" : "2 4"}
                opacity={g === 50 ? 0.6 : 0.4}
              />
              <text x={4} y={yScale(g) + 4} className="fill-current text-fg-subtle font-mono" style={{ fontSize: 10 }}>{g}</text>
            </g>
          ))}

          {/* Index area + line */}
          <defs>
            <linearGradient id="hist-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(var(--fg) / 0.18)" />
              <stop offset="100%" stopColor="rgb(var(--fg) / 0.0)" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#hist-fill)" />
          <path d={linePath} fill="none" stroke="rgb(var(--fg))" strokeWidth="1.6" />

          {/* Date ticks */}
          {dateTicks.map((t) => (
            <g key={t.i}>
              <line
                x1={PAD_X + t.i * xStep}
                y1={H - PAD_BOTTOM}
                x2={PAD_X + t.i * xStep}
                y2={H - PAD_BOTTOM + 4}
                stroke="rgb(var(--fg-subtle))"
                strokeWidth={1}
              />
              <text
                x={PAD_X + t.i * xStep}
                y={H - PAD_BOTTOM + 16}
                textAnchor="middle"
                className="fill-current text-fg-subtle font-mono"
                style={{ fontSize: 10 }}
              >
                {monthLabel(t.p.date)}
              </text>
            </g>
          ))}

          {/* Final marker */}
          {(() => {
            const last = points[points.length - 1];
            const x = PAD_X + (points.length - 1) * xStep;
            const y = yScale(last.index);
            return (
              <g>
                <circle cx={x} cy={y} r="4" fill="rgb(var(--fg))" />
                <circle cx={x} cy={y} r="8" fill="rgb(var(--fg) / 0.15)" />
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
