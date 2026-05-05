"use client";

import type { InsiderSnapshot } from "@/lib/types";
import { formatUsd } from "@/lib/format";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * Three small "what's driving the score" tiles below the dial — fill the
 * vertical real estate inside the hero card with editorial substance, not
 * blank space. Visible only on lg+ to avoid mobile crowding.
 */
export function HeroDrivers({ snapshot }: Props) {
  const totalDollars = snapshot.buyDollars + snapshot.sellDollars;
  const buyPct = totalDollars > 0 ? Math.round((snapshot.buyDollars / totalDollars) * 100) : 50;
  const topRoleBuyer = snapshot.leaderboard.find((r) => r.role === "CEO" || r.role === "CFO") ?? snapshot.leaderboard[0];
  const topCluster = snapshot.clusters[0];

  return (
    <div className="mt-4 w-full grid grid-cols-3 gap-2.5 max-w-[440px]">
      <Tile
        label="Buyers vs sellers"
        value={`${buyPct}%`}
        sub="of dollar flow"
        tone="positive"
        bar={buyPct}
      />
      <Tile
        label="Top single buy"
        value={topRoleBuyer ? topRoleBuyer.ticker : "—"}
        sub={topRoleBuyer ? `${topRoleBuyer.role} · ${formatUsd(topRoleBuyer.dollars)}` : "Tape is quiet"}
        tone="neutral"
      />
      <Tile
        label="Strongest cluster"
        value={topCluster ? topCluster.ticker : "—"}
        sub={topCluster ? `${topCluster.insiderCount} insiders · ${formatUsd(topCluster.totalDollars)}` : "No clusters"}
        tone="emerald"
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
  bar,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "positive" | "neutral" | "emerald";
  bar?: number;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] font-mono text-fg-subtle leading-tight">
        {label}
      </div>
      <div className="mt-1 font-mono tab-num text-[15px] font-semibold text-fg leading-none truncate">
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-fg-subtle leading-tight truncate">{sub}</div>
      {typeof bar === "number" && (
        <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-emerald" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
