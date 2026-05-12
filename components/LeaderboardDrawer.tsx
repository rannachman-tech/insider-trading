"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Users, ArrowUpRight, BookOpen, TrendingUp } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";
import type { SignalGroup } from "@/lib/aggregate";
import { formatUsd, formatPct, formatDate, formatNum } from "@/lib/format";
import { TradeSingleModal } from "./TradeSingleModal";

interface Props {
  group: SignalGroup | null;
  onClose: () => void;
}

/**
 * Drawer rendered after a signal-card click. The view adapts to whether
 * the group has a single insider (filings table) or many (per-insider
 * sub-cards with their own filings).
 *
 * The footer carries a TWO-CTA pattern requested by the reviewer:
 * primary "Buy on eToro" opens the in-app trade modal, secondary
 * "View on eToro" links out to the live market page on etoro.com.
 */
export function LeaderboardDrawer({ group, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!group) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [group, onClose]);

  if (!group || !mounted) return null;

  const isCluster = group.insiderCount >= 3;
  const convictionLabel = convictionBand(group.significance);
  const tradeRationale = tradeRationaleFor(group);

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
        <div className="relative w-full sm:max-w-xl bg-surface border border-border sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <header className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-fg">{group.ticker}</span>
                <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">{group.sector}</span>
                {isCluster && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-soft text-emerald border border-emerald/20">
                    <Users className="h-3 w-3" aria-hidden />
                    cluster
                  </span>
                )}
                {group.isAccumulation && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-soft text-amber border border-amber/20">
                    <TrendingUp className="h-3 w-3" aria-hidden />
                    accumulation
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[14px] text-fg-muted truncate">{group.company}</div>
            </div>
            <button onClick={onClose} className="p-1 -m-1 text-fg-muted hover:text-fg" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="px-5 py-4 space-y-5">
            <div className="rounded-md border border-emerald/30 bg-emerald-soft px-3.5 py-2.5 text-[13px] text-fg leading-relaxed">
              {headlineFor(group)}
            </div>

            {/* Signal composition — visual at-a-glance chips. Reviewer
                feedback: the modal still reads slightly report-like; this
                strip turns "2 insiders / 3 buys / 1 day" into a memorable
                visual unit. */}
            <CompositionStrip group={group} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat
                label="Conviction"
                value={`${group.significance} / 100`}
                sub={convictionLabel}
                mono
              />
              <Stat label="Total spent" value={formatUsd(group.totalDollars)} mono />
              <Stat label="Buys" value={`${group.buyCount}`} sub={`in ${group.daysSpan} day${group.daysSpan === 1 ? "" : "s"}`} mono />
              <Stat
                label="Insiders"
                value={`${group.insiderCount}`}
                sub={
                  isCluster
                    ? "cluster threshold"
                    : group.isAccumulation
                    ? "accumulation pattern"
                    : group.insiderCount === 1
                    ? "single insider"
                    : "multi-insider"
                }
                mono
              />
            </div>

            {/* "Why this matters" — historical context for the specific
                shape of this signal. Reinforces the methodology layer and
                gives the user a reason to trust the rank. */}
            <WhyThisMatters group={group} />

            {group.insiderCount === 1 ? (
              <SingleInsiderDetail row={group.lead} />
            ) : (
              <MultiInsiderDetail rows={group.rows} />
            )}

            {/* Action rail — Buy = in-app trade, View = etoro.com link.
                Reviewer + product owner aligned: every drawer should make
                the next step obvious. */}
            <div className="pt-3 border-t border-border space-y-2">
              <button
                onClick={() => setTradeOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald text-white px-4 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                Buy {group.ticker} on eToro
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <a
                href={`https://www.etoro.com/markets/${group.ticker.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-[12.5px] text-fg-muted hover:text-fg hover:border-border-strong transition-colors"
              >
                Or view {group.ticker} on eToro
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-1 text-[11px] text-fg-subtle text-center">
                Educational signal — not personalised advice. Trading involves risk.
              </p>
            </div>
          </div>
        </div>
      </div>

      <TradeSingleModal
        ticker={group.ticker}
        rationale={tradeRationale}
        open={tradeOpen}
        onClose={() => setTradeOpen(false)}
      />
    </>,
    document.body
  );
}

/**
 * Visual chip strip at the top of the drawer. Each chip is one fact in
 * the signal shape; together they compress "what happened" into a single
 * horizontal scan.
 */
function CompositionStrip({ group }: { group: SignalGroup }) {
  const chips: Array<{ label: string; value: string }> = [
    { label: "insiders", value: `${group.insiderCount}` },
    { label: `buy${group.buyCount === 1 ? "" : "s"}`, value: `${group.buyCount}` },
    { label: `day${group.daysSpan === 1 ? "" : "s"}`, value: `${group.daysSpan}` },
    { label: "total", value: formatUsd(group.totalDollars) },
  ];
  return (
    <div className="flex items-stretch gap-2 flex-wrap">
      {chips.map((c, idx) => (
        <div
          key={idx}
          className="flex-1 min-w-[64px] rounded-md border border-emerald/15 bg-emerald-soft/30 px-3 py-2 text-center"
        >
          <div className="font-mono tab-num text-[16px] font-semibold text-fg leading-none">{c.value}</div>
          <div className="mt-1 text-[9.5px] uppercase tracking-[0.16em] font-mono text-fg-subtle">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Mini context block — why this particular shape of signal matters. */
function WhyThisMatters({ group }: { group: SignalGroup }) {
  const body = whyBody(group);
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3.5 py-2.5">
      <div className="flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle font-semibold">
          Why this matters
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] text-fg-muted leading-relaxed">{body}</p>
    </div>
  );
}

function whyBody(group: SignalGroup): string {
  if (group.insiderCount >= 5) {
    return "5+ insider clusters are the rarest and strongest signal in the literature. Cohen, Malloy & Pomorski (2012) found the top-decile cluster portfolios produced roughly 7% annualised abnormal returns over 6–12 months.";
  }
  if (group.insiderCount >= 3) {
    return "3+ insider clusters in a 30-day window historically carry the strongest predictive power among insider signals. Multi-insider coordination is a far stronger read than any single buy.";
  }
  if (group.insiderCount === 2) {
    return "Two insiders buying independently is a partial cluster — it raises the bar above noise but doesn't yet meet the 3-insider threshold where academic returns turn most reliable.";
  }
  // Single-insider — but is it accumulation?
  if (group.isAccumulation) {
    const role = group.lead.role;
    const intensity = group.buyCount >= 5
      ? `${group.buyCount} separate buys across ${group.daysSpan} day${group.daysSpan === 1 ? "" : "s"}`
      : `${formatUsd(group.totalDollars)} deployed across ${group.daysSpan} day${group.daysSpan === 1 ? "" : "s"}`;
    if (role === "10%Owner") {
      return `Sustained accumulation by a 10%+ owner — ${intensity}. Large-stake holders adding to their position with this kind of intensity historically signals confidence in fundamentals (Lakonishok & Lee 2001 on buying intensity).`;
    }
    if (role === "CEO" || role === "CFO") {
      return `Sustained accumulation by the ${role} — ${intensity}. Repeated open-market purchases by a single C-suite officer is one of the strongest single-insider signals, even without cluster confirmation.`;
    }
    return `Sustained accumulation by a single insider — ${intensity}. Repeated buying in a short window is academia's second-strongest insider signal type after multi-insider clusters.`;
  }
  const role = group.lead.role;
  if (role === "CEO" || role === "CFO") {
    return `${role} open-market purchases are the role most consistently linked to forward returns in published research. The signal weakens without cluster confirmation, but a single C-suite name remains worth a thesis check.`;
  }
  if (role === "10%Owner") {
    return "Large-stake holders (10%+) adding to their position signals alignment, but on its own carries less forward-return signal than C-suite buying. Watch for cluster confirmation.";
  }
  return "A single Director or Officer buy is one data point. It rises in importance only when paired with cluster activity or C-suite involvement.";
}

function convictionBand(score: number): string {
  if (score >= 75) return "High-conviction signal";
  if (score >= 55) return "Strong setup";
  if (score >= 40) return "Emerging signal";
  if (score >= 20) return "Borderline — watch";
  return "Below threshold";
}

function tradeRationaleFor(group: SignalGroup): string {
  if (group.insiderCount >= 3) {
    return `${group.insiderCount} insiders bought ${group.ticker} in the last 30 days — combined ${formatUsd(group.totalDollars)}. Cluster buying is the strongest documented insider signal.`;
  }
  if (group.insiderCount === 2) {
    return `2 insiders bought ${group.ticker} independently — partial cluster confirmation, combined ${formatUsd(group.totalDollars)}.`;
  }
  const r = group.lead;
  if (group.isAccumulation) {
    return `${r.insiderName} (${r.officerTitle ?? r.role}) accumulated ${formatUsd(group.totalDollars)} of ${group.ticker} across ${group.buyCount} buys in ${group.daysSpan} day${group.daysSpan === 1 ? "" : "s"} — sustained accumulation pattern.`;
  }
  return `${r.insiderName} (${r.officerTitle ?? r.role}) bought ${formatUsd(r.dollars)} of ${group.ticker} — a +${Math.abs(r.stakePctChange).toFixed(1)}% increase to their stake.`;
}

function SingleInsiderDetail({ row }: { row: LeaderboardRow }) {
  return (
    <>
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">The insider</div>
        <div className="mt-1.5 text-[15px] font-medium text-fg">{row.insiderName}</div>
        <div className="text-[12px] text-fg-muted">{row.officerTitle ?? row.role}</div>
        <div className="mt-1 text-[12px] text-fg-subtle">
          {formatPct(row.stakePctChange)} increase to existing stake
          {row.transactions.length > 0 && (
            <> · now owns {formatNum(row.transactions.at(-1)?.sharesOwnedAfter ?? 0)} shares</>
          )}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
          Filings ({row.transactions.length})
        </div>
        <ul className="space-y-2">
          {row.transactions.map((t) => (
            <li key={t.accession} className="flex items-center justify-between gap-3 text-[13px] py-1.5 border-b border-border last:border-0">
              <span className="text-fg-muted">{formatDate(t.transactionDate, { withYear: true })}</span>
              <span className="font-mono tab-num text-fg">{formatNum(t.shares)} sh @ ${t.pricePerShare.toFixed(2)}</span>
              <span className="font-mono tab-num text-fg font-medium">{formatUsd(t.dollars)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function MultiInsiderDetail({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
        The insiders ({rows.length})
      </div>
      <ul className="space-y-3">
        {rows.map((r, idx) => (
          <li key={`${r.insiderName}-${idx}`} className="rounded-md border border-border bg-surface-2 px-3.5 py-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5 min-w-0">
                <InsiderAvatar name={r.insiderName} role={r.role} />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-fg">{r.insiderName}</div>
                  <div className="text-[11.5px] text-fg-subtle">
                    {r.officerTitle ?? r.role}
                    {r.stakePctChange >= 1 && <> · +{Math.abs(r.stakePctChange).toFixed(1)}% to holding</>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono tab-num text-[14px] font-semibold text-fg">{formatUsd(r.dollars)}</div>
                <div className="text-[10.5px] font-mono tab-num text-fg-subtle">
                  {r.transactions.length} buy{r.transactions.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <details className="mt-2 text-[12px] text-fg-muted">
              <summary className="cursor-pointer text-fg-subtle hover:text-fg-muted">View {r.transactions.length} filing{r.transactions.length === 1 ? "" : "s"}</summary>
              <ul className="mt-2 space-y-1.5">
                {r.transactions.map((t) => (
                  <li key={t.accession} className="flex items-center justify-between gap-3 text-[12px] py-1 border-b border-border/60 last:border-0">
                    <span className="text-fg-subtle">{formatDate(t.transactionDate, { withYear: true })}</span>
                    <span className="font-mono tab-num text-fg-muted">{formatNum(t.shares)} sh @ ${t.pricePerShare.toFixed(2)}</span>
                    <span className="font-mono tab-num text-fg">{formatUsd(t.dollars)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsiderAvatar({ name, role }: { name: string; role: string }) {
  const initials = getInitials(name);
  const isC = role === "CEO" || role === "CFO";
  const isOwner = role === "10%Owner";
  const cls = isC
    ? "bg-emerald/15 text-emerald border-emerald/30"
    : isOwner
    ? "bg-amber/15 text-amber border-amber/30"
    : "bg-surface text-fg-muted border-border";
  return (
    <div
      className={`flex-shrink-0 grid place-items-center w-8 h-8 rounded-full border font-mono text-[10px] font-semibold ${cls}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = (name ?? "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Stat({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">{label}</div>
      <div className={`mt-1 text-[15px] font-semibold text-fg ${mono ? "font-mono tab-num" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-fg-subtle mt-0.5">{sub}</div>}
    </div>
  );
}

/** Plain-English context line — the headline of the drawer. */
function headlineFor(group: SignalGroup): string {
  if (group.insiderCount >= 3) {
    return `Cluster buy — ${group.insiderCount} distinct insiders deployed personal cash within 30 days. Cluster buying is the strongest documented insider signal in academic research.`;
  }
  if (group.insiderCount === 2) {
    return `Two insiders bought independently — partial cluster confirmation but still below the 3-insider threshold that historically carries the most signal.`;
  }
  const lead = group.lead;
  if (group.isAccumulation) {
    return `Sustained accumulation — ${group.buyCount} open-market buys totalling ${formatUsd(group.totalDollars)} across ${group.daysSpan} day${group.daysSpan === 1 ? "" : "s"}. Repeated buying by one insider is academia's second-strongest insider signal type after multi-insider clusters.`;
  }
  if (lead.role === "CEO" || lead.role === "CFO") {
    return `${lead.role} buying their own company's stock${lead.dollars >= 1_000_000 ? ` — ${formatUsd(lead.dollars)} of personal cash deployed` : ""}${lead.stakePctChange >= 5 ? ` — ${formatPct(lead.stakePctChange)} increase to existing stake.` : "."}`;
  }
  if (lead.dollars >= 1_000_000 && lead.stakePctChange >= 5) {
    return `${formatUsd(lead.dollars)} of personal cash deployed — ${formatPct(lead.stakePctChange)} increase to existing stake.`;
  }
  return `Single-insider buy by the ${lead.role}. Worth watching, but cluster confirmation (3+ insiders) carries more weight historically.`;
}
