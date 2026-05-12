"use client";

import type { InsiderSnapshot } from "@/lib/types";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * The horizontal "regime spectrum" — replaces the analog dial.
 *
 * Three layers, each answering a different question retail users ask
 * in this order:
 *
 *   1. "Should I be excited or worried?"   → phase name in phase color
 *   2. "How strong, exactly?"               → score number + named band
 *   3. "Is that high or low for this market?" → percentile vs 60d range
 *
 * Wide, linear, mobile-friendly, no analog skeuomorphism. Built so a user
 * can read the whole hero in ~half a second without scrolling or thinking.
 */
const BANDS = [
  { min: 0,  max: 25,  label: "Cautious",     accent: "crimson" },
  { min: 25, max: 50,  label: "Mixed",        accent: "amber" },
  { min: 50, max: 75,  label: "Constructive", accent: "emerald" },
  { min: 75, max: 101, label: "Strong buying", accent: "emerald" },
] as const;

const BAND_TEXT: Record<(typeof BANDS)[number]["accent"], string> = {
  crimson: "text-crimson",
  amber: "text-amber",
  emerald: "text-emerald",
};

export function ConvictionMeter({ snapshot }: Props) {
  const score = Math.max(0, Math.min(100, snapshot.index));
  const band = BANDS.find((b) => score >= b.min && score < b.max) ?? BANDS[1];

  // Percentile context from the real history series (same logic as the
  // standalone HistoryPercentile component — folded in here so the
  // hero card carries it inline).
  const real = (snapshot.history ?? []).filter(
    (p) => !(p as { synthetic?: boolean }).synthetic
  );
  const hasPercentile = real.length >= 14;
  const sorted = real.map((p) => p.index).sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= score);
  const percentile = hasPercentile
    ? Math.max(1, Math.min(99, Math.round(((rank < 0 ? sorted.length : rank) / sorted.length) * 100)))
    : null;
  const lo = hasPercentile ? sorted[0] : 0;
  const hi = hasPercentile ? sorted[sorted.length - 1] : 100;
  const median = hasPercentile ? sorted[Math.floor(sorted.length / 2)] : 50;

  const lookback =
    real.length >= 350 ? "12 months" :
    real.length >= 90  ? `${Math.round(real.length / 30)} months` :
    `${real.length} days`;

  // Phase narrative — the second-line subhead that tells the user
  // what the spectrum position MEANS in plain English.
  const narrative = phaseNarrative(snapshot, band.label);

  return (
    <div className="w-full max-w-[460px]">
      {/* Layer 1 — Hero: phase name + score */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Insider conviction · S&amp;P 1500 · last 7d
          </div>
          <div className={`mt-1 text-[26px] sm:text-[30px] font-semibold tracking-tight leading-none ${BAND_TEXT[band.accent]}`}>
            {band.label}
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <div className="font-mono tab-num text-[44px] sm:text-[52px] font-semibold leading-none text-fg">
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-fg-subtle">
            / 100
          </div>
        </div>
      </div>
      {narrative && (
        <p className="mt-1.5 text-[12px] text-fg-muted leading-relaxed">{narrative}</p>
      )}

      {/* Layer 2 — Regime spectrum bar */}
      <div className="mt-5">
        <div className="relative">
          {/* Gradient bar with 4 zones */}
          <div className="flex h-3.5 rounded-full overflow-hidden shadow-inner">
            <div className="flex-1" style={{ background: "linear-gradient(to right, rgb(var(--crimson) / 0.65), rgb(var(--crimson) / 0.45))" }} />
            <div className="flex-1" style={{ background: "linear-gradient(to right, rgb(var(--amber) / 0.45), rgb(var(--amber) / 0.5))" }} />
            <div className="flex-1" style={{ background: "linear-gradient(to right, rgb(var(--emerald) / 0.5), rgb(var(--emerald) / 0.7))" }} />
            <div className="flex-1" style={{ background: "linear-gradient(to right, rgb(var(--emerald) / 0.7), rgb(var(--emerald) / 0.95))" }} />
          </div>

          {/* "Today" marker pin */}
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${score}%` }}
          >
            <div className="relative -translate-x-1/2">
              <div className="w-1 h-7 bg-fg rounded-full shadow-md" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-fg border-2 border-bg shadow-md" />
            </div>
          </div>
        </div>

        {/* Band labels under each zone */}
        <div className="mt-2 grid grid-cols-4 text-[9.5px] uppercase tracking-[0.12em] font-mono text-fg-subtle">
          <div className="text-center">Cautious</div>
          <div className="text-center">Mixed</div>
          <div className="text-center">Constructive</div>
          <div className="text-center">Strong&nbsp;buy</div>
        </div>
      </div>

      {/* Layer 3 — Percentile context vs 60d history. Lighter footprint
          than the previous design (no border, smaller bar height) so the
          hero column doesn't feel vertically dense. */}
      {hasPercentile && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              Vs last {lookback}
            </div>
            <div className="text-[10.5px] font-mono tab-num text-fg-muted">
              <span className="font-semibold text-fg">{ordinal(percentile!)} percentile</span>
              {" · "}
              <span>median {median}</span>
            </div>
          </div>

          <div className="mt-2 relative h-2 rounded-full bg-surface-2 overflow-hidden">
            {/* historical range bar */}
            <div
              className="absolute top-0 bottom-0 bg-border-strong/30"
              style={{ left: `${lo}%`, width: `${Math.max(2, hi - lo)}%` }}
            />
            {/* median tick */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-fg-subtle"
              style={{ left: `calc(${median}% - 3px)` }}
            />
            {/* today dot */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-bg shadow-md ${
                band.accent === "crimson" ? "bg-crimson" :
                band.accent === "amber" ? "bg-amber" : "bg-emerald"
              }`}
              style={{ left: `calc(${score}% - 6px)` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10.5px] font-mono tab-num text-fg-subtle">
            <span>
              low <strong className="text-fg-muted">{lo}</strong>
            </span>
            <span>
              today <strong className="text-fg">{score}</strong>
            </span>
            <span>
              high <strong className="text-fg-muted">{hi}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Plain-English line under the phase name that ties it to today's signal mix. */
function phaseNarrative(s: InsiderSnapshot, bandLabel: string): string {
  const ceoCfoBuys = s.leaderboard.filter(
    (r) => r.role === "CEO" || r.role === "CFO"
  ).length;
  const lift: string[] = [];
  if (s.clusterCount >= 1) lift.push(`${s.clusterCount} cluster ${s.clusterCount === 1 ? "buy" : "buys"}`);
  if (ceoCfoBuys >= 1) lift.push(`${ceoCfoBuys} C-suite buyer${ceoCfoBuys === 1 ? "" : "s"}`);
  const liftStr = lift.length ? lift.join(", ") : "selective insider activity";

  if (bandLabel === "Strong buying") {
    return `Broad-based insider conviction — ${liftStr} drove the score above 75.`;
  }
  if (bandLabel === "Constructive") {
    return `${liftStr} pushing the index up, but broader selling holds it shy of strong buying.`;
  }
  if (bandLabel === "Mixed") {
    return s.clusterCount >= 1
      ? `Cluster activity lifted it, broader market-wide selling held it near 50.`
      : `Buys and sells roughly cancel out — no directional message.`;
  }
  return `Insider selling dominates the tape this week — apply scrutiny to any C-suite sells.`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
