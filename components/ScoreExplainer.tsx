"use client";

import { useState } from "react";
import { ChevronDown, BookOpen, ExternalLink } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { formatUsd } from "@/lib/format";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * "How this score is built" — collapsible explainer of the conviction index
 * formula and the academic basis. Surfaces the math the user is implicitly
 * trusting when they read the headline number.
 *
 * Sits below the hero, above the indicators row.
 */
export function ScoreExplainer({ snapshot }: Props) {
  // Default-open: methodology should be visible, not hidden behind a click.
  // The user can still collapse it if they want.
  const [open, setOpen] = useState(true);

  const totalDollars = snapshot.buyDollars + snapshot.sellDollars;
  const dollarComponent =
    totalDollars > 0 ? ((snapshot.buyDollars - snapshot.sellDollars) / totalDollars) * 0.55 : 0;
  const totalCount = snapshot.buyCount + snapshot.sellCount;
  const countComponent =
    totalCount > 0 ? ((snapshot.buyCount - snapshot.sellCount) / totalCount) * 0.25 : 0;
  const clusterComponent = Math.min(1, snapshot.clusterCount / 10) * 0.2;

  // Convert the raw -1..+1 components to their contribution in 0–100 space
  const dollarContrib = Math.round(dollarComponent * 50);
  const countContrib = Math.round(countComponent * 50);
  const clusterContrib = Math.round(clusterComponent * 50);
  const baseline = 50;

  return (
    <section className="rounded-lg border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-fg-muted" aria-hidden />
          <div>
            <div className="text-[13px] font-semibold text-fg">How this score is built</div>
            <div className="text-[11.5px] text-fg-subtle mt-0.5">
              The math behind today's <span className="font-mono tab-num">{snapshot.index}</span>, plus the research it's grounded in.
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-border">
          {/* Formula */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
              Today's reading, broken down
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <Row label="Baseline (neutral starting point)" value={baseline} signed={false} />
              <Row
                label="Net dollar flow — buys vs sells"
                sub={`${formatUsd(snapshot.buyDollars)} buys vs ${formatUsd(snapshot.sellDollars)} sells · 55% weight`}
                value={dollarContrib}
              />
              <Row
                label="Buyer vs seller count"
                sub={`${snapshot.buyCount} buyers vs ${snapshot.sellCount} sellers · 25% weight`}
                value={countContrib}
              />
              <Row
                label="Cluster buys"
                sub={`${snapshot.clusterCount} cluster${snapshot.clusterCount === 1 ? "" : "s"} (3+ insiders, same name, 30 days) · 20% weight`}
                value={clusterContrib}
              />
              <Row label="Today" value={snapshot.index} signed={false} bold />
            </div>
            <p className="mt-2 text-[11.5px] text-fg-subtle leading-relaxed">
              Trades are also role-weighted before they enter these aggregates: a CEO buy carries more weight than a director buy, which carries more than a 10% owner adjustment. Pre-scheduled sales (10b5-1 plans) are excluded entirely.
            </p>
          </div>

          {/* Filters */}
          <div className="pt-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
              What we exclude before counting
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 text-[12.5px] text-fg-muted leading-relaxed">
              <li>· Stock grants and RSU vests (compensation, not conviction)</li>
              <li>· Option exercises (cash-out, not new buying)</li>
              <li>· Tax-withholding sales (automatic)</li>
              <li>· Pre-scheduled 10b5-1 sales (set months ahead)</li>
              <li>· Any transaction below $25,000</li>
              <li>· Form 4/A amendments without new transactions</li>
            </ul>
          </div>

          {/* Academic findings table */}
          <div className="pt-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
              What published research has found
            </div>
            <p className="text-[12px] text-fg-muted leading-relaxed mb-3">
              These are findings from peer-reviewed academic studies — not our own backtests. Magnitudes are averages across thousands of trades over multi-decade samples, not predictions for any individual position.
            </p>
            <div className="rounded-md border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-x-3 px-3.5 py-2.5 bg-surface-2 border-b border-border text-[10.5px] uppercase tracking-[0.16em] font-mono text-fg-subtle">
                <div>Signal pattern</div>
                <div className="text-right">Reported abnormal return</div>
              </div>
              <FindingRow
                pattern="3+ insider cluster, non-routine buys"
                source="Cohen-Malloy-Pomorski 2012"
                ret="+6 to +10%"
                horizon="12 months"
                tone="positive"
              />
              <FindingRow
                pattern="Single CEO open-market purchase ≥ $500k"
                source="Lakonishok-Lee 2001"
                ret="+4 to +6%"
                horizon="12 months"
                tone="positive"
              />
              <FindingRow
                pattern="Director or 10% owner buys"
                source="Lakonishok-Lee 2001"
                ret="+1 to +3%"
                horizon="12 months"
                tone="neutral"
              />
              <FindingRow
                pattern="Insider net-selling regimes (non-10b5-1)"
                source="Cohen-Malloy-Pomorski 2012"
                ret="−1 to −3%"
                horizon="12 months relative"
                tone="negative"
              />
            </div>
            <p className="mt-3 text-[11.5px] text-fg-subtle leading-relaxed">
              References:{" "}
              <a
                href="https://onlinelibrary.wiley.com/doi/10.1111/j.1540-6261.2012.01740.x"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald inline-flex items-center gap-0.5"
              >
                Cohen, Malloy &amp; Pomorski 2012
                <ExternalLink className="h-3 w-3" />
              </a>
              {" · "}
              <a
                href="https://academic.oup.com/rfs/article-abstract/14/1/79/1599129"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald inline-flex items-center gap-0.5"
              >
                Lakonishok &amp; Lee 2001
                <ExternalLink className="h-3 w-3" />
              </a>
              . Both studies emphasize the signal lives in <em>buys</em>, not sells — sells are dominated by diversification, taxes and scheduled plans.
            </p>
          </div>

          <div className="pt-3 border-t border-border text-[11px] text-fg-subtle leading-relaxed">
            <strong className="text-fg-muted font-medium">Important:</strong> we do not run our own backtests on this dashboard. The numbers above come directly from peer-reviewed published research. Insider data is one signal among many; past relationships do not guarantee future returns.
          </div>
        </div>
      )}
    </section>
  );
}

function FindingRow({
  pattern,
  source,
  ret,
  horizon,
  tone,
}: {
  pattern: string;
  source: string;
  ret: string;
  horizon: string;
  tone: "positive" | "neutral" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-emerald" : tone === "negative" ? "text-crimson" : "text-fg-muted";
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3 px-3.5 py-2.5 border-t border-border first:border-t-0">
      <div className="min-w-0">
        <div className="text-[12.5px] text-fg leading-tight">{pattern}</div>
        <div className="text-[10.5px] text-fg-subtle mt-0.5">{source}</div>
      </div>
      <div className="text-right">
        <div className={`font-mono tab-num text-[13px] font-semibold ${toneClass}`}>{ret}</div>
        <div className="text-[10.5px] text-fg-subtle mt-0.5">{horizon}</div>
      </div>
    </div>
  );
}

function Row({
  label,
  sub,
  value,
  signed = true,
  bold = false,
}: {
  label: string;
  sub?: string;
  value: number;
  signed?: boolean;
  bold?: boolean;
}) {
  const display = signed ? `${value > 0 ? "+" : value < 0 ? "" : "±"}${value}` : `${value}`;
  const tone =
    !signed
      ? "text-fg"
      : value > 0
      ? "text-emerald"
      : value < 0
      ? "text-crimson"
      : "text-fg-muted";
  return (
    <div className={`px-3.5 py-2.5 flex items-center justify-between gap-4 ${bold ? "bg-surface-2 border-t border-border" : "bg-surface"} not-first:border-t border-border`}>
      <div className="min-w-0">
        <div className={`text-[13px] ${bold ? "font-semibold text-fg" : "text-fg-muted"}`}>{label}</div>
        {sub && <div className="text-[11px] text-fg-subtle truncate">{sub}</div>}
      </div>
      <div className={`font-mono tab-num text-[15px] ${bold ? "font-semibold" : "font-medium"} ${tone}`}>
        {display}
      </div>
    </div>
  );
}
