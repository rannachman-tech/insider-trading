"use client";

import { Zap, Users, Crown, Info } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { formatUsd, formatDate } from "@/lib/format";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * Primary Signal callout — there is ALWAYS one most-important story this week.
 *
 * Priority cascade:
 *   1. Strongest cluster (3+ insiders, same name, 30 days) — highest published edge
 *   2. CEO/CFO open-market buy with the highest conviction score
 *   3. Largest single-trade conviction by significance (any role)
 *   4. Empty state only if there are zero real buys this week
 *
 * Eliminates the "no cluster activity this week" dead-air state. The user
 * always gets one story to anchor on at the top of the page.
 */
export function StrongestSignal({ snapshot }: Props) {
  const topCluster = snapshot.clusters[0];

  // 1. Cluster wins outright if one exists
  if (topCluster) {
    return <ClusterCallout cluster={topCluster} />;
  }

  // 2. Otherwise: highest-conviction single-name story
  const ceoCfoLead = snapshot.leaderboard.find(
    (r) => r.role === "CEO" || r.role === "CFO"
  );
  const top = ceoCfoLead ?? snapshot.leaderboard[0];

  if (!top) {
    return (
      <section className="rounded-lg border border-border bg-surface-2 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-full bg-fg/8 text-fg-muted">
            <Users className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              Today's primary signal
            </div>
            <h3 className="mt-1.5 text-[16px] font-semibold tracking-tight text-fg leading-snug">
              The tape is quiet
            </h3>
            <p className="mt-1.5 text-[13px] text-fg-muted leading-relaxed">
              No real personal-cash insider buys above the $25k threshold passed our filters this week. Pre-scheduled sales, RSU vests, and option exercises are excluded — those aren't conviction signals. Check back tomorrow.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return <SingleNameCallout row={top} hasCEO={!!ceoCfoLead} />;
}

function ClusterCallout({ cluster: top }: { cluster: NonNullable<InsiderSnapshot["clusters"][number]> }) {
  const topInsiders = top.insiders.slice(0, 3);
  return (
    <section className="rounded-lg border border-emerald/30 bg-emerald-soft px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-full bg-emerald/15 text-emerald">
          <Zap className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-emerald">
              Today's primary signal
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-fg-subtle">
              · cluster buy detected
            </span>
          </div>
          <h3 className="mt-1.5 text-[17px] sm:text-[19px] font-semibold tracking-tight text-fg leading-snug">
            <span className="font-mono">{top.ticker}</span> · {top.insiderCount} insiders bought {formatUsd(top.totalDollars)} of their own company's stock
          </h3>
          <p className="mt-1.5 text-[13px] text-fg-muted leading-relaxed">
            {topInsiders.map((i, idx) => (
              <span key={idx}>
                <strong className="text-fg font-medium">{i.role}</strong>{" "}{shortName(i.name)}
                {idx < topInsiders.length - 1 ? ", " : ""}
              </span>
            ))}
            {top.insiderCount > topInsiders.length ? `, plus ${top.insiderCount - topInsiders.length} more` : ""}
            {" — all bought in the last 30 days. Cluster buys are the strongest documented insider signal in the academic literature."}
          </p>
          <div className="mt-2 text-[11px] font-mono tab-num text-fg-subtle">
            Latest filing {formatDate(top.latestDate, { withYear: true })} · cluster strength {top.strength}/100
          </div>
        </div>
      </div>
    </section>
  );
}

function SingleNameCallout({
  row,
  hasCEO,
}: {
  row: NonNullable<InsiderSnapshot["leaderboard"][number]>;
  hasCEO: boolean;
}) {
  const isCSuite = row.role === "CEO" || row.role === "CFO";
  // Same accumulation logic the leaderboard uses
  const days = accumulationDays(row.transactions);
  const txCount = row.transactions.length;

  const headline = (() => {
    if (isCSuite) {
      return `${row.ticker} · ${row.role} bought ${formatUsd(row.dollars)} of their own company's stock`;
    }
    return `${row.ticker} · ${row.role} bought ${formatUsd(row.dollars)} — largest open-market trade this week`;
  })();

  const detail = (() => {
    const stake = row.stakePctChange >= 5
      ? `, lifting their existing stake by +${row.stakePctChange.toFixed(0)}%`
      : "";
    const accumNote = txCount >= 2
      ? ` This was ${txCount} buys spread across ${days} day${days === 1 ? "" : "s"} — accumulation, not a one-shot.`
      : "";
    if (isCSuite) {
      return `${row.insiderName} (${row.officerTitle ?? row.role}) bought with personal cash this week${stake}.${accumNote} C-suite open-market purchases carry above-average forward returns in published research — but no clusters formed yet, so the score waits for confirmation.`;
    }
    return `${row.insiderName} (${row.officerTitle ?? row.role}) made the largest single-name conviction trade on the tape${stake}.${accumNote} Without cluster confirmation (3+ insiders), this is a single data point — informative but not yet a pattern.`;
  })();

  return (
    <section className="rounded-lg border border-amber/25 bg-amber-soft/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-full bg-amber/15 text-amber">
          <Crown className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-amber">
              Today's primary signal
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-fg-subtle">
              · {isCSuite ? "C-suite open-market buy" : "largest single-name conviction"}
            </span>
          </div>
          <h3 className="mt-1.5 text-[17px] sm:text-[19px] font-semibold tracking-tight text-fg leading-snug">
            {headline}
          </h3>
          <p className="mt-1.5 text-[13px] text-fg-muted leading-relaxed">{detail}</p>
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-fg-subtle">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" aria-hidden />
            <span>
              No cluster (3+ insiders, same name) has formed this week. When one does, it'll replace this as the primary signal.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function shortName(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[0];
  const first = parts[1];
  return `${first[0]}. ${last.charAt(0)}${last.slice(1).toLowerCase()}`;
}

function accumulationDays(txs: { transactionDate: string }[]): number {
  if (txs.length < 2) return 1;
  const dates = txs.map((t) => new Date(t.transactionDate).getTime()).filter(Number.isFinite);
  if (!dates.length) return 1;
  const span = (Math.max(...dates) - Math.min(...dates)) / 86_400_000;
  return Math.max(1, Math.round(span) + 1);
}
