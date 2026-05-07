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
  const [open, setOpen] = useState(false);

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

          {/* Academic basis */}
          <div className="pt-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
              Why these signals — academic basis
            </div>
            <div className="space-y-2 text-[12.5px] text-fg-muted leading-relaxed">
              <p>
                The cluster-buy signal is the strongest documented retail-accessible insider edge.
                Cohen, Malloy &amp; Pomorski (2012) found that <strong className="text-fg font-medium">non-routine</strong> insider purchases — exactly what we filter for here — predict abnormal returns of roughly 6–10% over the following 12 months.
              </p>
              <p>
                Lakonishok &amp; Lee (2001), the canonical earlier study, found similar magnitudes for cluster-buy patterns in small- and mid-cap names. Both studies emphasize that the signal lives in <em>buys</em>, not sells — sells are dominated by diversification, taxes, and scheduled plans.
              </p>
              <p className="text-[11.5px] text-fg-subtle pt-1">
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
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border text-[11px] text-fg-subtle leading-relaxed">
            Insider data is one signal among many. Past relationships do not guarantee future returns. We do not run our own backtests on this dashboard — we point to peer-reviewed published findings and let you weigh the evidence yourself.
          </div>
        </div>
      )}
    </section>
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
