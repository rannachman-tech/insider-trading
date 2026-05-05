"use client";

import type { SectorTile } from "@/lib/types";
import { formatUsd } from "@/lib/format";

interface Props {
  sectors: SectorTile[];
}

export function SectorHeatmap({ sectors }: Props) {
  if (!sectors.length) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-fg">Sector tilt</h2>
          <p className="mt-0.5 text-[12px] text-fg-subtle">
            Net buy/sell ratio per sector this week (-100% all selling, +100% all buying)
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sectors.map((s) => {
          const intensity = Math.min(1, Math.abs(s.netRatio));
          const tone = s.netRatio >= 0 ? "emerald" : "crimson";
          const bg = `rgb(var(--${tone}-soft) / ${0.4 + intensity * 0.6})`;
          const fg = `rgb(var(--${tone}))`;
          const total = s.buyDollars + s.sellDollars;
          return (
            <li key={s.sector} className="rounded-md border border-border overflow-hidden">
              <div className="px-3.5 py-3 bg-surface-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-fg truncate">{s.sector}</div>
                    <div className="mt-0.5 text-[11px] font-mono tab-num text-fg-subtle">
                      {s.buyCount} buys · {s.sellCount} sells
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
                  {/* Centerline */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
                  {s.netRatio >= 0 ? (
                    <div
                      className="absolute top-0 h-full bg-emerald rounded-full"
                      style={{ left: "50%", width: `${(s.netRatio * 50).toFixed(1)}%` }}
                    />
                  ) : (
                    <div
                      className="absolute top-0 h-full bg-crimson rounded-full"
                      style={{ right: "50%", width: `${(Math.abs(s.netRatio) * 50).toFixed(1)}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono tab-num text-fg-subtle">
                  <span>buy {formatUsd(s.buyDollars)}</span>
                  <span>{formatUsd(total)} total</span>
                  <span>sell {formatUsd(s.sellDollars)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
