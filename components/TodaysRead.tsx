"use client";

import type { InsiderSnapshot } from "@/lib/types";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * Single composed sentence describing what's driving today's index reading.
 * Built from live signals so the user gets a "so what" without parsing
 * tiles. Lives directly under the hero, above Top Signals.
 *
 * Composition rules:
 *   - Lead with the dominant force (net flow direction OR cluster activity)
 *   - Mention CEO/CFO involvement if material
 *   - Note clusters' presence or absence
 *   - End with a posture cue ("constructive setup" / "mixed" / "watch
 *     defensively" — kept measured, no alarm tone).
 */
export function TodaysRead({ snapshot }: Props) {
  const sentence = composeSentence(snapshot);
  return (
    <p className="text-[14px] sm:text-[15px] text-fg leading-relaxed">
      <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mr-1.5">
        Today
      </span>
      {sentence}
    </p>
  );
}

function composeSentence(s: InsiderSnapshot): string {
  const totalDollars = s.buyDollars + s.sellDollars;
  const dollarSignal = totalDollars > 0 ? (s.buyDollars - s.sellDollars) / totalDollars : 0;
  const totalCount = s.buyCount + s.sellCount;
  const countSignal = totalCount > 0 ? (s.buyCount - s.sellCount) / totalCount : 0;
  const cluster = s.clusterCount;

  // Material thresholds
  const strongDollars = Math.abs(dollarSignal) > 0.4;
  const strongCount = Math.abs(countSignal) > 0.4;
  const ceoCfoBuyers = s.leaderboard.filter(
    (r) => r.role === "CEO" || r.role === "CFO"
  ).length;

  const parts: string[] = [];

  // 1. Lead with the dominant force
  if (cluster >= 1) {
    const top = s.clusters[0];
    const ceoCfoInTop = top?.insiders.some((i) => i.role === "CEO" || i.role === "CFO");
    parts.push(
      `${cluster} cluster ${cluster === 1 ? "buy" : "buys"} this month` +
        (ceoCfoInTop ? ` (lead cluster includes the ${top.insiders.find((i) => i.role === "CEO" || i.role === "CFO")?.role})` : "")
    );
  } else if (s.phase === "heavy-buying" && strongDollars && dollarSignal > 0) {
    parts.push("broad-based net buying across the tape");
  } else if (s.phase === "heavy-selling" && strongDollars && dollarSignal < 0) {
    parts.push("more dollars going out than coming in");
  } else if (s.phase === "balanced") {
    parts.push("buys and sells roughly cancel out");
  } else {
    parts.push(`a ${s.phase === "heavy-buying" ? "tilt to buying" : s.phase === "heavy-selling" ? "tilt to selling" : "mixed picture"}`);
  }

  // 2. Add CEO/CFO involvement if material
  if (ceoCfoBuyers >= 1) {
    parts.push(
      `${ceoCfoBuyers} ${ceoCfoBuyers === 1 ? "C-suite officer" : "C-suite officers"} bought their own stock`
    );
  } else if (s.phase === "heavy-selling") {
    parts.push("no C-suite buys to offset");
  }

  // 3. Cluster context if no clusters
  if (cluster === 0 && s.phase !== "balanced") {
    parts.push("no cluster activity to lean on");
  }

  // 4. Closing posture cue
  let close: string;
  if (s.phase === "heavy-buying" && cluster >= 2) {
    close = "the kind of setup published research finds constructive";
  } else if (s.phase === "heavy-buying") {
    close = "directionally constructive but lighter than a true conviction tape";
  } else if (s.phase === "balanced") {
    close = "no directional message worth acting on alone";
  } else if (cluster >= 1) {
    close = "but at least one cluster gives a partial offset";
  } else {
    close = "a measured, not alarmed, read";
  }
  parts.push(close);

  // Stitch
  const body = parts.slice(0, -1).join(", ");
  const ending = parts[parts.length - 1];
  return `${capFirst(body)} — ${ending}.`;
}

function capFirst(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}
