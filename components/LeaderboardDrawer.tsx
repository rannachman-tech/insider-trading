"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Users } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";
import type { SignalGroup } from "@/lib/aggregate";
import { formatUsd, formatPct, formatDate, formatNum } from "@/lib/format";

interface Props {
  group: SignalGroup | null;
  onClose: () => void;
}

/**
 * Drawer rendered after a signal-card click. The view adapts to whether
 * the group has a single insider (filings table) or many (per-insider
 * sub-cards with their own filings).
 */
export function LeaderboardDrawer({ group, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
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

  return createPortal(
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Conviction" value={`${group.significance} / 100`} mono />
            <Stat label="Total spent" value={formatUsd(group.totalDollars)} mono />
            <Stat label="Buys" value={`${group.buyCount}`} sub={`in ${group.daysSpan} day${group.daysSpan === 1 ? "" : "s"}`} mono />
            <Stat label="Insiders" value={`${group.insiderCount}`} sub={group.insiderCount >= 3 ? "cluster threshold" : group.insiderCount === 1 ? "single insider" : "multi-insider"} mono />
          </div>

          {group.insiderCount === 1 ? (
            <SingleInsiderDetail row={group.lead} />
          ) : (
            <MultiInsiderDetail rows={group.rows} />
          )}

          <div className="pt-3 border-t border-border">
            <a
              href={`https://www.etoro.com/markets/${group.ticker.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-fg text-bg px-4 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              View {group.ticker} on eToro
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-2 text-[11px] text-fg-subtle text-center">
              Trading stocks involves risk. Make sure you have funds available.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-fg">{r.insiderName}</div>
                <div className="text-[11.5px] text-fg-subtle">
                  {r.officerTitle ?? r.role}
                  {r.stakePctChange >= 1 && <> · +{Math.abs(r.stakePctChange).toFixed(1)}% to holding</>}
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
  if (lead.role === "CEO" || lead.role === "CFO") {
    return `${lead.role} buying their own company's stock${lead.dollars >= 1_000_000 ? ` — ${formatUsd(lead.dollars)} of personal cash deployed` : ""}${lead.stakePctChange >= 5 ? ` — ${formatPct(lead.stakePctChange)} increase to existing stake.` : "."}`;
  }
  if (lead.dollars >= 1_000_000 && lead.stakePctChange >= 5) {
    return `${formatUsd(lead.dollars)} of personal cash deployed — ${formatPct(lead.stakePctChange)} increase to existing stake.`;
  }
  return `Single-insider buy by the ${lead.role}. Worth watching, but cluster confirmation (3+ insiders) carries more weight historically.`;
}
