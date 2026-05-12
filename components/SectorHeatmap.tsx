"use client";

import type { SectorTile } from "@/lib/types";
import { formatUsd } from "@/lib/format";

interface Props {
  sectors: SectorTile[];
}

const MIN_TRADES_FOR_TILE = 3;

export function SectorHeatmap({ sectors }: Props) {
  if (!sectors.length) return null;

  // Split into tile-worthy sectors (≥3 trades) and footnote-only sectors.
  // Showing 1- or 2-trade sectors as full tiles overstates their signal —
  // even with a "Low n" badge, the visual weight reads as "strong".
  const tiles = sectors.filter((s) => s.buyCount + s.sellCount >= MIN_TRADES_FOR_TILE);
  const footnote = sectors.filter((s) => s.buyCount + s.sellCount < MIN_TRADES_FOR_TILE);

  if (!tiles.length && !footnote.length) return null;

  if (!tiles.length) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5">
        <header>
          <h2 className="text-base font-semibold text-fg">Sector tilt</h2>
        </header>
        <div className="mt-3 rounded-md border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[13px] text-fg-muted">
          Too few sector-level trades this week to draw a meaningful tilt. Check back as more filings come in.
        </div>
        {footnote.length > 0 && <FootnoteRow sectors={footnote} />}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header>
        <h2 className="text-base font-semibold text-fg">Sector tilt</h2>
        <p className="mt-0.5 text-[12px] text-fg-subtle">
          Net buy/sell ratio per sector this week. Sectors with fewer than {MIN_TRADES_FOR_TILE} trades are listed below as a footnote — those readings are noise more often than signal.
        </p>
      </header>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tiles.map((s) => {
          const total = s.buyCount + s.sellCount;
          const intensity = Math.min(1, Math.abs(s.netRatio));
          const tone = s.netRatio >= 0 ? "emerald" : "crimson";
          const opacity = 0.4 + intensity * 0.6;
          const bg = `rgb(var(--${tone}-soft) / ${opacity})`;
          const fg = `rgb(var(--${tone}))`;
          const totalDollars = s.buyDollars + s.sellDollars;
          // Confidence weighting — a +100% on 3 trades visually overstates
          // its signal vs +100% on 9 trades. Scale opacity (not the number)
          // so the data is honest while the rendering reflects how much we
          // should trust it. Saturation reaches 1.0 at ~10 trades.
          const confidence = Math.min(1, total / 10);
          // Below ~0.5 confidence (≤5 trades), we'd render the tile faded.
          const tileOpacity = 0.55 + 0.45 * confidence;
          return (
            <li
              key={s.sector}
              className="rounded-md border border-border overflow-hidden"
              style={{ opacity: tileOpacity }}
              title={total < 5 ? `${total} trades — low-confidence reading` : undefined}
            >
              <div className="px-3.5 py-3 bg-surface-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-fg truncate">{s.sector}</div>
                    <div className="mt-0.5 text-[11px] font-mono tab-num text-fg-subtle">
                      {s.buyCount} buy{s.buyCount === 1 ? "" : "s"} · {s.sellCount} sell{s.sellCount === 1 ? "" : "s"}
                      {total < 5 && (
                        <span className="ml-1.5 text-fg-subtle opacity-75">· low n</span>
                      )}
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
                      className="absolute top-0 h-full rounded-full"
                      style={{ background: `rgb(var(--emerald))`, left: "50%", width: `${(s.netRatio * 50).toFixed(1)}%`, opacity: 0.55 + 0.45 * confidence }}
                    />
                  ) : (
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{ background: `rgb(var(--crimson))`, right: "50%", width: `${(Math.abs(s.netRatio) * 50).toFixed(1)}%`, opacity: 0.55 + 0.45 * confidence }}
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

      {footnote.length > 0 && <FootnoteRow sectors={footnote} />}
    </section>
  );
}

function FootnoteRow({ sectors }: { sectors: SectorTile[] }) {
  return (
    <div className="mt-4 pt-3 border-t border-border">
      <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-1.5">
        Sectors with too few trades to read confidently
      </div>
      <p className="text-[11.5px] text-fg-subtle leading-relaxed">
        {sectors
          .map((s) => `${s.sector} (${s.buyCount + s.sellCount} ${s.buyCount + s.sellCount === 1 ? "trade" : "trades"})`)
          .join(" · ")}
      </p>
    </div>
  );
}
