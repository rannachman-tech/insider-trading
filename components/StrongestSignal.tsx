"use client";

import { Zap, Users, Info } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { formatUsd, formatDate } from "@/lib/format";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * "Today's strongest signal" — the academically-strongest element of the
 * dashboard surfaced as the editorial centerpiece, not buried beneath the
 * indicators row. Cluster buys (3+ insiders, same company, 30 days) are
 * the highest-conviction insider pattern in the literature.
 *
 * If clusters exist this period: surface the top one prominently.
 * If none exist: explain what we're looking for and why its absence is
 * itself information.
 */
export function StrongestSignal({ snapshot }: Props) {
  const top = snapshot.clusters[0];

  if (top) {
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
                Today's strongest signal
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

  return (
    <section className="rounded-lg border border-border bg-surface-2 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-full bg-fg/8 text-fg-muted">
          <Users className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
            Today's strongest signal
          </div>
          <h3 className="mt-1.5 text-[16px] font-semibold tracking-tight text-fg leading-snug">
            No cluster activity this week
          </h3>
          <p className="mt-1.5 text-[13px] text-fg-muted leading-relaxed">
            We're watching for moments when 3 or more insiders at the same company independently buy the stock with personal cash within a 30-day window. Academic research finds this specific pattern carries the highest predictive signal — but it doesn't happen every week. When it does, it'll be the top story on this page.
          </p>
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-fg-subtle">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" aria-hidden />
            <span>
              {snapshot.buyCount} individual insider buys this week were not part of clusters. <strong className="text-fg-muted font-medium">Two filings from the same person doesn't qualify</strong> — clusters require three different beneficial owners at the same company.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function shortName(name: string): string {
  // EDGAR convention: "LAST FIRST [MIDDLE]" → "F. Last"
  const parts = name.split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[0];
  const first = parts[1];
  return `${first[0]}. ${last.charAt(0)}${last.slice(1).toLowerCase()}`;
}
