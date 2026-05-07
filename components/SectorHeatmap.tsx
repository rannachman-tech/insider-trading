"use client";

import type { SectorTile } from "@/lib/types";
import { formatUsd } from "@/lib/format";

interface Props {
  sectors: SectorTile[];
}

const MIN_TRADES_FOR_FULL_DISPLAY = 4;
const MIN_TRADES_TO_SHOW = 2;

export function SectorHeatmap({ sectors }: Props) {
  if (!sectors.length) return null;

  // Statistical guard: a sector with 1 trade isn't a sector signal — it's a
  // single insider. Hide entries below MIN_TRADES_TO_SHOW. Mark entries below
  // MIN_TRADES_FOR_FULL_DISPLAY as low-confidence so the user reads the noise.
  const visible = sectors.filter((s) => s.buyCount + s.sellCount >= MIN_TRADES_TO_SHOW);
  if (!visible.length) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5">
        <header>
          <h2 className="text-base font-semibold text-fg">Sector tilt</h2>
        </header>
        <div className="mt-3 rounded-md border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[13px] text-fg-muted">
          Too few sector-level trades this week to draw a meaningful tilt. Check back as more filings come in.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-base font-semibold text-fg">Sector tilt</h2>
          <p className="mt-0.5 text-[12px] text-fg-subtle">
            Net buy/sell ratio per sector this week. Sectors with very few trades are flagged as low-confidence — those readings are noise more often than signal.
          </p>
        </div>
      </header>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((s) => {
          const total = s.buyCount + s.sellCount;
          const lowConfidence = total < MIN_TRADES_FOR_FULL_DISPLAY;
          const intensity = Math.min(1, Math.abs(s.netRatio));
          const tone = s.netRatio >= 0 ? "emerald" : "crimson";
          // De-saturate low-confidence entries so they don't pop visually
          const opacity = lowConfidence ? 0.35 + intensity * 0.25 : 0.4 + intensity * 0.6;
          const bg = `rgb(var(--${tone}-soft) / ${opacity})`;
          const fg = `rgb(var(--${tone}))`;
          const totalDollars = s.buyDollars + s.sellDollars;
          return (
            <li
              key={s.sector}
              className={`rounded-md border ${lowConfidence ? "border-dashed border-border" : "border-border"} overflow-hidden`}
            >
              <div className="px-3.5 py-3 bg-surface-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-medium truncate ${lowConfidence ? "text-fg-muted" : "text-fg"}`}>
                        {s.sector}
                      </span>
                      {lowConfidence && (
                        <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] text-fg-subtle border border-border bg-surface px-1 py-px rounded" title="Fewer than 4 trades — read as noise, not signal">
                          Low n
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] font-mono tab-num text-fg-subtle">
                      {s.buyCount} buy{s.buyCount === 1 ? "" : "s"} · {s.sellCount} sell{s.sellCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div
                    className="rounded px-2 py-0.5 text-[11px] font-mono tab-num font-semibold"
                    style={{ background: bg, color: fg }}
                  >
                    {s.netRatio >= 0 ? "+" : ""}
                    {(s.netRatio * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 bg-border rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
                  {s.netRatio >= 0 ? (
                    <div
                      className={`absolute top-0 h-full rounded-full ${lowConfidence ? "opacity-50" : ""}`}
                      style={{ background: `rgb(var(--emerald))`, left: "50%", width: `${(s.netRatio * 50).toFixed(1)}%` }}
                    />
                  ) : (
                    <div
                      className={`absolute top-0 h-full rounded-full ${lowConfidence ? "opacity-50" : ""}`}
                      style={{ background: `rgb(var(--crimson))`, right: "50%", width: `${(Math.abs(s.netRatio) * 50).toFixed(1)}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono tab-num text-fg-subtle">
                  <span>buy {formatUsd(s.buyDollars)}</span>
                  <span>{formatUsd(totalDollars)} total</span>
                  <span>sell {formatUsd(s.sellDollars)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10.5px] text-fg-subtle leading-relaxed">
        <strong className="text-fg-muted font-medium">Reading note:</strong> a sector tilt based on 1–3 trades is one or two insider decisions, not an industry view. We mark those as <span className="font-mono uppercase">Low n</span> to prevent over-reading.
      </p>
    </section>
  );
}
