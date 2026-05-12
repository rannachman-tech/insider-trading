"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Crown, Users } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";
import { aggregateByTicker, type SignalGroup } from "@/lib/aggregate";
import { formatUsd } from "@/lib/format";
import { ConvictionBar } from "./ConvictionBar";
import { ConvictionBadge } from "./ConvictionBadge";
import { LeaderboardDrawer } from "./LeaderboardDrawer";
import { Tooltip } from "./Tooltip";

interface Props {
  rows: LeaderboardRow[];
}

const ROLE_BADGE: Record<string, string> = {
  CEO: "bg-emerald-soft text-emerald border-emerald/20",
  CFO: "bg-emerald-soft text-emerald border-emerald/20",
  President: "bg-amber-soft text-amber border-amber/20",
  COO: "bg-amber-soft text-amber border-amber/20",
  Chair: "bg-amber-soft text-amber border-amber/20",
  Director: "bg-surface-2 text-fg-muted border-border",
  Officer: "bg-surface-2 text-fg-muted border-border",
  "10%Owner": "bg-amber-soft text-amber border-amber/20",
  Other: "bg-surface-2 text-fg-muted border-border",
};

const DEFAULT_VISIBLE = 12;
// LOW = significance < 40 (matches ConvictionBadge thresholds).
// Default view hides LOW-conviction groups so the user's first read is
// HIGH + MED only.
const LOW_CONVICTION_THRESHOLD = 40;

/**
 * Ticker-level signal cards.
 *
 * Each card represents one ticker, aggregating every insider that bought
 * it this week. The card reads as a single "signal object":
 *
 *     MOBI · Mobia Medical                CLUSTER · 5 insiders
 *     $11.02M total · 12 buys in 5 days · 10%Owner-led          HIGH
 *
 * Clicking expands the drawer with per-insider breakdown and filings.
 */
export function Leaderboard({ rows }: Props) {
  const groups = useMemo(() => aggregateByTicker(rows), [rows]);
  const [open, setOpen] = useState<SignalGroup | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!groups.length) {
    return (
      <section className="rounded-lg border border-border bg-surface p-6 text-center text-fg-muted">
        Tape is quiet — no Code-P buys above the threshold this week.
      </section>
    );
  }

  const strongGroups = groups.filter((g) => g.significance >= LOW_CONVICTION_THRESHOLD);
  const baseGroups = strongGroups.length > 0 ? strongGroups : groups; // never hide everything
  const visibleGroups = showAll ? groups : baseGroups.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = Math.max(0, groups.length - visibleGroups.length);
  const hiddenLowCount = groups.length - strongGroups.length;

  return (
    <>
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        <header className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">This week's biggest insider signals</h2>
            <p className="mt-0.5 text-[12px] text-fg-subtle leading-relaxed">
              One card per ticker — every insider buying that name is grouped here.{" "}
              <Tooltip
                label="Open-market purchases"
                hint="When an insider spends their own personal cash to buy their company's stock on the open market — the strongest insider conviction signal there is."
              />
              {" "}only. We exclude{" "}
              <Tooltip
                label="pre-scheduled sales"
                hint="10b5-1 plans are sale schedules set months in advance, often automatic. They tell you nothing about timing or insider conviction."
              />
              {" "}and{" "}
              <Tooltip
                label="option exercises"
                hint="Cash-out moves where an insider converts options to shares — usually followed by an immediate sale. Not new buying."
              />
              . Tap any card for the insider breakdown.
            </p>
          </div>
          <div className="hidden sm:block text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle shrink-0 ml-3 text-right leading-tight">
            <div>{visibleGroups.length} stronger signals</div>
            <div className="opacity-60 normal-case tracking-normal">{groups.length} tickers this week</div>
          </div>
        </header>

        <ul className="divide-y divide-border">
          {visibleGroups.map((g) => (
            <li key={g.ticker}>
              <SignalRow group={g} onOpen={() => setOpen(g)} />
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <div className="border-t border-border px-5 py-3 flex items-center justify-center">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-muted hover:text-fg transition-colors font-medium"
            >
              {showAll
                ? "Show stronger signals only"
                : hiddenLowCount > 0
                ? `Show all ${groups.length} tickers (incl. ${hiddenLowCount} low-conviction)`
                : `Show all ${groups.length} tickers (${hiddenCount} more)`}
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-90" : "rotate-0"}`} />
            </button>
          </div>
        )}
      </section>

      <LeaderboardDrawer group={open} onClose={() => setOpen(null)} />
    </>
  );
}

function SignalRow({ group, onOpen }: { group: SignalGroup; onOpen: () => void }) {
  const { ticker, company, lead, insiderCount, buyCount, daysSpan, totalDollars, topRole, significance, rank, isCluster } = group;

  // "Lead role-led" label: when there's only one insider, just show the role.
  // When there are several, lead with the top role + "-led" so the user
  // immediately sees who's driving the signal.
  const roleLabel = insiderCount === 1
    ? topRole
    : `${topRole}-led`;

  return (
    <button
      onClick={onOpen}
      className="w-full px-4 sm:px-5 py-3.5 grid grid-cols-[28px_1fr_auto] sm:grid-cols-[32px_1.4fr_2fr_auto_auto] items-center gap-3 sm:gap-4 hover:bg-surface-2 transition-colors text-left"
    >
      {/* Rank */}
      <div className="flex items-center justify-center">
        {rank <= 3 ? (
          <Crown className={`h-4 w-4 ${rank === 1 ? "text-emerald" : rank === 2 ? "text-amber" : "text-fg-muted"}`} aria-hidden />
        ) : (
          <span className="text-[12px] font-mono tab-num text-fg-subtle">{rank}</span>
        )}
      </div>

      {/* Ticker + company + lead role */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold text-fg">{ticker}</span>
          <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${ROLE_BADGE[topRole] ?? ROLE_BADGE.Other}`}>
            {roleLabel}
          </span>
          {isCluster && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-soft text-emerald border border-emerald/20">
              <Users className="h-3 w-3" aria-hidden />
              cluster
            </span>
          )}
        </div>
        <div className="text-[12px] text-fg-subtle truncate">{company}</div>
      </div>

      {/* Insider summary — hidden on small */}
      <div className="hidden sm:block min-w-0">
        {insiderCount === 1 ? (
          <>
            <div className="text-[13px] text-fg truncate">{lead.insiderName}</div>
            <div className="text-[11px] text-fg-subtle truncate">
              {lead.officerTitle ?? lead.role}
            </div>
          </>
        ) : (
          <>
            <div className="text-[13px] text-fg truncate">
              {insiderCount} insiders bought
            </div>
            <div className="text-[11px] text-fg-subtle truncate">
              Lead: {lead.insiderName} · {lead.officerTitle ?? lead.role}
            </div>
          </>
        )}
      </div>

      {/* Dollars + accumulation framing */}
      <div className="text-right">
        <div className="font-mono tab-num text-sm font-semibold text-fg">
          {formatUsd(totalDollars)}
          {buyCount > 1 && (
            <span className="ml-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-fg-subtle font-medium">
              · {buyCount} buy{buyCount === 1 ? "" : "s"} in {daysSpan}d
            </span>
          )}
        </div>
        <div className="hidden sm:block text-[11px] font-mono tab-num text-fg-subtle">
          {insiderCount === 1
            ? `+${Math.abs(lead.stakePctChange).toFixed(1)}% to holding`
            : `${insiderCount} insiders · last 30d`}
        </div>
      </div>

      {/* Conviction badge + bar */}
      <div className="flex items-center gap-2 min-w-0 sm:w-[150px] justify-end">
        <ConvictionBadge value={significance} />
        <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
          <ConvictionBar value={significance} />
          <ChevronRight className="h-4 w-4 text-fg-subtle flex-shrink-0" aria-hidden />
        </div>
        <ChevronRight className="sm:hidden h-4 w-4 text-fg-subtle flex-shrink-0" aria-hidden />
      </div>
    </button>
  );
}
