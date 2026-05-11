"use client";

import type { InsiderSnapshot } from "@/lib/types";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * One-line percentile context for today's index, shown inline under the
 * hero. Replaces the standalone 12-month chart — same percentile reading,
 * tighter footprint, honest about the actual lookback we have.
 *
 * Empty when we have <14 days of real history (would be a meaningless
 * percentile claim).
 */
export function HistoryPercentile({ snapshot }: Props) {
  const history = snapshot.history ?? [];
  const real = history.filter((p) => !(p as { synthetic?: boolean }).synthetic);
  if (real.length < 14) return null;

  const sorted = real.map((p) => p.index).sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= snapshot.index);
  const percentile = Math.max(
    1,
    Math.min(99, Math.round(((rank < 0 ? sorted.length : rank) / sorted.length) * 100))
  );
  const yearMin = sorted[0];
  const yearMax = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const days = real.length;

  const lookback =
    days >= 350 ? "12 months" :
    days >= 90 ? `${Math.round(days / 30)} months` :
    `${days} days`;

  return (
    <p className="mt-2.5 text-[11.5px] text-fg-subtle leading-relaxed text-center max-w-[440px]">
      Today's index is in the{" "}
      <strong className="text-fg-muted font-mono tab-num">{ordinal(percentile)} percentile</strong>
      {" "}of the last {lookback}{" "}
      <span className="opacity-70">(range {yearMin}–{yearMax}, median {median})</span>.
    </p>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
