"use client";

import { useState } from "react";
import { ChevronRight, Crown } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";
import { formatUsd, formatPct, formatDate } from "@/lib/format";
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
// Default view hides LOW rows so the user's first read is HIGH + MED only.
const LOW_CONVICTION_THRESHOLD = 40;

export function Leaderboard({ rows }: Props) {
  const [open, setOpen] = useState<LeaderboardRow | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!rows.length) {
    return (
      <section className="rounded-lg border border-border bg-surface p-6 text-center text-fg-muted">
        Tape is quiet — no Code-P buys above the threshold this week.
      </section>
    );
  }
  const strongRows = rows.filter((r) => r.significance >= LOW_CONVICTION_THRESHOLD);
  const baseRows = strongRows.length > 0 ? strongRows : rows; // never hide everything
  const visibleRows = showAll ? rows : baseRows.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);
  const hiddenLowCount = rows.length - strongRows.length;

  return (
    <>
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        <header className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">This week's biggest insider buys</h2>
            <p className="mt-0.5 text-[12px] text-fg-subtle leading-relaxed">
              <Tooltip
                label="Open-market purchases"
                hint="When an insider spends their own personal cash to buy their company's stock on the open market — the strongest insider conviction signal there is."
              />
              {" "}only. We exclude{" "}
              <Tooltip
                label="pre-scheduled sales"
                hint="10b5-1 plans are sale schedules set months in advance, often automatic. They tell you nothing about timing or insider conviction."
              />
              ,{" "}
              <Tooltip
                label="option exercises"
                hint="Cash-out moves where an insider converts options to shares — usually followed by an immediate sale. Not new buying."
              />
              {" "}and stock grants. Tap any row for details.
            </p>
          </div>
          <div className="hidden sm:block text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle shrink-0 ml-3 text-right leading-tight">
            <div>{visibleRows.length} stronger signals</div>
            <div className="opacity-60 normal-case tracking-normal">{rows.length} total this week</div>
          </div>
        </header>

        <ul className="divide-y divide-border">
          {visibleRows.map((r) => (
            <li key={`${r.ticker}-${r.insiderName}`}>
              <button
                onClick={() => setOpen(r)}
                className="w-full px-4 sm:px-5 py-3.5 grid grid-cols-[28px_1fr_auto] sm:grid-cols-[32px_1.4fr_2fr_auto_auto] items-center gap-3 sm:gap-4 hover:bg-surface-2 transition-colors text-left"
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  {r.rank <= 3 ? (
                    <Crown className={`h-4 w-4 ${r.rank === 1 ? "text-emerald" : r.rank === 2 ? "text-amber" : "text-fg-muted"}`} aria-hidden />
                  ) : (
                    <span className="text-[12px] font-mono tab-num text-fg-subtle">{r.rank}</span>
                  )}
                </div>

                {/* Ticker + company */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-fg">{r.ticker}</span>
                    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${ROLE_BADGE[r.role] ?? ROLE_BADGE.Other}`}>
                      {r.role}
                    </span>
                  </div>
                  <div className="text-[12px] text-fg-subtle truncate">{r.company}</div>
                </div>

                {/* Insider — hidden on small */}
                <div className="hidden sm:block min-w-0">
                  <div className="text-[13px] text-fg truncate">{r.insiderName}</div>
                  <div className="text-[11px] text-fg-subtle truncate">
                    {r.officerTitle ?? r.role} · {formatDate(r.transactions[0].transactionDate)}
                  </div>
                </div>

                {/* Dollars */}
                <div className="text-right">
                  <div className="font-mono tab-num text-sm font-semibold text-fg">
                    {formatUsd(r.dollars)}
                    {r.transactions.length > 1 && (
                      <span className="ml-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-fg-subtle font-medium">
                        · {r.transactions.length} buys in {accumulationDays(r.transactions)}d
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-[11px] font-mono tab-num text-fg-subtle">
                    +{Math.abs(r.stakePctChange).toFixed(1)}% to holding
                  </div>
                </div>

                {/* Conviction badge + bar — bar hidden on small */}
                <div className="flex items-center gap-2 min-w-0 sm:w-[150px] justify-end">
                  <ConvictionBadge value={r.significance} />
                  <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
                    <ConvictionBar value={r.significance} />
                    <ChevronRight className="h-4 w-4 text-fg-subtle flex-shrink-0" aria-hidden />
                  </div>
                  <ChevronRight className="sm:hidden h-4 w-4 text-fg-subtle flex-shrink-0" aria-hidden />
                </div>
              </button>
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
                ? `Show all ${rows.length} buys (incl. ${hiddenLowCount} low-conviction)`
                : `Show all ${rows.length} buys (${hiddenCount} more)`}
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-90" : "rotate-0"}`} />
            </button>
          </div>
        )}
      </section>

      <LeaderboardDrawer row={open} onClose={() => setOpen(null)} />
    </>
  );
}

/**
 * Number of calendar days spanned by a row's transactions, inclusive.
 * Used to render "2 buys in 3d" so the user sees accumulation over time,
 * not just a count.
 */
function accumulationDays(txs: { transactionDate: string }[]): number {
  if (txs.length < 2) return 1;
  const dates = txs.map((t) => new Date(t.transactionDate).getTime()).filter(Number.isFinite);
  if (!dates.length) return 1;
  const span = (Math.max(...dates) - Math.min(...dates)) / 86_400_000;
  return Math.max(1, Math.round(span) + 1);
}
