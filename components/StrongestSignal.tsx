"use client";

import { useState } from "react";
import { Zap, Users, Crown, Info, ArrowUpRight } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { formatUsd, formatDate } from "@/lib/format";
import { TradeSingleModal } from "./TradeSingleModal";

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
            {" — all bought in the last 30 days."}
          </p>
          <div className="mt-2 text-[11px] font-mono tab-num text-fg-subtle">
            Latest filing {formatDate(top.latestDate, { withYear: true })} · cluster strength {top.strength}/100 · {convictionBand(top.strength)}
          </div>

          {/* Cluster progression strip — visual coordination, not just text.
              Each insider is a chip; together they read as a buying sequence. */}
          <ClusterProgression cluster={top} />

          {/* Intelligence rail — why this ranked #1 + the historical context
              behind the call. Lifts the card from "interesting row" to "a
              piece of intelligence you can act on." */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <IntelTile
              kind="rank"
              title="Why this ranked #1"
              body={whyRankedFirst(top)}
            />
            <IntelTile
              kind="research"
              title="What research says"
              body={researchContext(top.insiderCount)}
            />
          </div>

          <div className="mt-3">
            <PrimaryCta
              ticker={top.ticker}
              variant="cluster"
              rationale={`${top.insiderCount} insiders bought ${top.ticker} in the last 30 days — combined ${formatUsd(top.totalDollars)}. Cluster buys are the strongest documented insider signal.`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function IntelTile({
  kind,
  title,
  body,
}: {
  kind: "rank" | "research";
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-emerald/20 bg-emerald-soft/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[9.5px] uppercase tracking-[0.16em] font-mono text-emerald font-semibold">
          {kind === "rank" ? "Ranked #1 because" : "Academic context"}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-fg leading-relaxed">{body}</p>
    </div>
  );
}

/** One-line reason this cluster outranked everything else on the tape. */
function whyRankedFirst(c: NonNullable<InsiderSnapshot["clusters"][number]>): string {
  const ceoCfoCount = c.insiders.filter((i) => i.role === "CEO" || i.role === "CFO").length;
  const tenPctCount = c.insiders.filter((i) => i.role === "10%Owner").length;
  if (ceoCfoCount > 0) {
    return `${c.insiderCount} distinct insiders deployed personal cash within 30 days, including ${ceoCfoCount} C-suite officer${ceoCfoCount === 1 ? "" : "s"} — the role weighting most studies tie to forward returns.`;
  }
  if (tenPctCount > 0) {
    return `${c.insiderCount} distinct insiders deployed personal cash within 30 days, led by ${tenPctCount} 10% owner${tenPctCount === 1 ? "" : "s"} — large-stake holders add their own capital, signalling alignment.`;
  }
  return `${c.insiderCount} distinct insiders deployed personal cash within 30 days — multi-insider clusters carry the strongest documented edge, regardless of role.`;
}

/**
 * Horizontal strip showing each insider as a coloured chip + dollar size.
 * Reads as a buying sequence: who's in the cluster, in what role, with
 * what conviction. Three insiders feel like a wave, not a checklist.
 */
function ClusterProgression({
  cluster,
}: {
  cluster: NonNullable<InsiderSnapshot["clusters"][number]>;
}) {
  // Show up to 5 insiders inline; "+N more" pill if longer
  const display = cluster.insiders.slice(0, 5);
  const overflow = cluster.insiders.length - display.length;
  return (
    <div className="mt-3 rounded-md border border-emerald/20 bg-emerald-soft/40 px-3 py-2.5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] font-mono text-emerald font-semibold mb-2">
        Cluster composition
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {display.map((i, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 rounded-full bg-surface border border-emerald/25 pl-1 pr-2.5 py-0.5"
          >
            <span className="grid place-items-center w-5 h-5 rounded-full bg-emerald/15 text-emerald font-mono text-[9.5px] font-semibold">
              {initialsFor(i.name)}
            </span>
            <span className="text-[11px] text-fg font-medium">
              {shortRole(i.role)}
            </span>
            <span className="text-[10.5px] font-mono tab-num text-fg-subtle">
              {compactUsd(i.dollars)}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="rounded-full bg-emerald/10 border border-emerald/25 px-2.5 py-1 text-[10.5px] text-emerald font-medium">
            +{overflow} more
          </div>
        )}
      </div>
    </div>
  );
}

function shortRole(role: string): string {
  if (role === "10%Owner") return "10% Owner";
  return role;
}

function initialsFor(name: string): string {
  const parts = (name ?? "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function compactUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
}

function convictionBand(score: number): string {
  if (score >= 75) return "high-conviction";
  if (score >= 55) return "strong setup";
  if (score >= 40) return "emerging signal";
  return "watch list";
}

/** Academic context calibrated to the size of the cluster. */
function researchContext(insiderCount: number): string {
  if (insiderCount >= 5) {
    return `5+ insider clusters are rare. Cohen, Malloy & Pomorski (2012) found these top decile clusters produced ~7% annualized abnormal returns over 6–12 months.`;
  }
  if (insiderCount >= 4) {
    return `4+ insider clusters historically outperform. Lakonishok & Lee (2001) documented monotonic returns as cluster size grows — more buyers, stronger signal.`;
  }
  return `Multi-insider clusters (3+) are the strongest documented insider signal. Single-name purchases carry far less weight on average.`;
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
          <div className="mt-3">
            <PrimaryCta
              ticker={row.ticker}
              variant="single"
              rationale={`${row.insiderName} (${row.officerTitle ?? row.role}) bought ${formatUsd(row.dollars)} of ${row.ticker} this week — a +${Math.abs(row.stakePctChange).toFixed(1)}% increase to their existing stake.`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Single primary call-to-action used by both Cluster and Single-name
 * callouts. Always visible, no matter the phase. Opens the one-click
 * trade modal — Review → Confirm → Execute → Result, same eToro Public
 * API integration as the basket card. Falls back to a plain link inside
 * the modal when the ticker isn't in our verified instrument catalog.
 */
function PrimaryCta({
  ticker,
  variant,
  rationale,
}: {
  ticker: string;
  variant: "cluster" | "single";
  rationale?: string;
}) {
  const [open, setOpen] = useState(false);
  const tone =
    variant === "cluster"
      ? "bg-emerald text-white border-emerald hover:opacity-90"
      : "bg-fg text-bg border-fg hover:opacity-90";
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-[13px] font-semibold transition-opacity ${tone}`}
      >
        Buy {ticker} on eToro
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </button>
      <TradeSingleModal
        ticker={ticker}
        rationale={rationale}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
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
