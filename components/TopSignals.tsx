"use client";

import { Sparkles, ArrowUpRight } from "lucide-react";
import type { InsiderSnapshot, ClusterBuy, LeaderboardRow } from "@/lib/types";
import { formatUsd } from "@/lib/format";

interface Props {
  snapshot: InsiderSnapshot;
}

interface Signal {
  ticker: string;
  company: string;
  title: string;
  rationale: string;
  metric: string;
  metricLabel: string;
  /** Composite priority score for ordering */
  priority: number;
  /** Optional kind tag for the small badge */
  kind: "cluster" | "ceo" | "cfo" | "scale" | "ratio";
}

/**
 * "Top signals to investigate" — the prioritization layer.
 *
 * Curates 3-5 highest-priority stories from the snapshot with one-line "why
 * it matters" framing each. Built from clusters + leaderboard rows + role
 * patterns. Ranked by a composite priority score that favours the patterns
 * with the strongest published-research backing.
 *
 * This is what makes the dashboard sticky — the user gets a curated triage
 * list rather than a pile of ingredients.
 */
export function TopSignals({ snapshot }: Props) {
  const signals = curateSignals(snapshot);

  if (signals.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface px-5 py-4">
        <header className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fg-muted" aria-hidden />
          <h2 className="text-base font-semibold text-fg">Top signals to investigate</h2>
        </header>
        <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">
          Nothing reaches the priority threshold this week. Insider activity is light or evenly split — no single name stands out as worth a closer look. Check back tomorrow.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface overflow-hidden">
      <header className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-semibold text-fg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber" aria-hidden />
            Top signals to investigate
          </h2>
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
            {signals.length} {signals.length === 1 ? "story" : "stories"} this week
          </span>
        </div>
        <p className="mt-1 text-[12px] text-fg-subtle leading-relaxed">
          The patterns most worth a second look — ranked by signal quality, not dollar size. Tap a row to dig in on the leaderboard below.
        </p>
      </header>

      <ol className="divide-y divide-border">
        {signals.map((s, i) => (
          <li key={`${s.ticker}-${i}`}>
            <a
              href={`https://www.etoro.com/markets/${s.ticker.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="grid grid-cols-[28px_1fr_auto] sm:grid-cols-[28px_1fr_auto_28px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-surface-2 transition-colors text-left"
            >
              <div className="text-center">
                <span className="font-mono tab-num text-[13px] font-semibold text-fg-muted">{i + 1}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-fg">{s.ticker}</span>
                  <KindBadge kind={s.kind} />
                </div>
                <div className="mt-0.5 text-[13px] text-fg leading-snug">{s.title}</div>
                <div className="mt-0.5 text-[12px] text-fg-muted leading-relaxed">{s.rationale}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono tab-num text-[13px] font-semibold text-fg">{s.metric}</div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] font-mono text-fg-subtle mt-0.5">
                  {s.metricLabel}
                </div>
              </div>
              <ArrowUpRight className="hidden sm:inline h-4 w-4 text-fg-subtle" aria-hidden />
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

const KIND_BADGE: Record<Signal["kind"], { label: string; cls: string }> = {
  cluster: { label: "Cluster", cls: "bg-emerald-soft text-emerald border-emerald/25" },
  ceo: { label: "CEO buy", cls: "bg-emerald-soft text-emerald border-emerald/25" },
  cfo: { label: "CFO buy", cls: "bg-emerald-soft text-emerald border-emerald/25" },
  scale: { label: "Large $", cls: "bg-amber-soft text-amber border-amber/25" },
  ratio: { label: "Big stake", cls: "bg-amber-soft text-amber border-amber/25" },
};

function KindBadge({ kind }: { kind: Signal["kind"] }) {
  const b = KIND_BADGE[kind];
  return (
    <span className={`inline-flex items-center text-[9.5px] font-mono uppercase tracking-[0.12em] font-semibold px-1.5 py-0.5 rounded border ${b.cls}`}>
      {b.label}
    </span>
  );
}

/**
 * Build a prioritized list of stories from the snapshot. Priority is a
 * composite score weighted to surface clusters and CEO/CFO buys above
 * raw dollar size — matching where the academic edge actually lives.
 */
function curateSignals(snapshot: InsiderSnapshot, limit = 5): Signal[] {
  const out: Signal[] = [];

  // 1. Every cluster is automatically a top signal
  for (const c of snapshot.clusters) {
    out.push(clusterToSignal(c));
  }

  // 2. CEO/CFO buys not already covered by a cluster
  const coveredTickers = new Set(out.map((s) => s.ticker));
  const c_suite = snapshot.leaderboard
    .filter((r) => (r.role === "CEO" || r.role === "CFO") && !coveredTickers.has(r.ticker))
    .sort((a, b) => b.significance - a.significance);
  for (const r of c_suite) {
    out.push(roleToSignal(r));
    coveredTickers.add(r.ticker);
    if (out.length >= limit) break;
  }

  // 3. Big stake-increase trades (insider doubled their position)
  const stakeMovers = snapshot.leaderboard
    .filter((r) => !coveredTickers.has(r.ticker) && r.stakePctChange >= 25)
    .sort((a, b) => b.stakePctChange - a.stakePctChange);
  for (const r of stakeMovers) {
    out.push(stakeToSignal(r));
    coveredTickers.add(r.ticker);
    if (out.length >= limit) break;
  }

  // 4. Largest single-buy dollar amount as a fallback only
  const largeDollar = snapshot.leaderboard
    .filter((r) => !coveredTickers.has(r.ticker) && r.dollars >= 1_000_000)
    .sort((a, b) => b.dollars - a.dollars);
  for (const r of largeDollar) {
    out.push(scaleToSignal(r));
    if (out.length >= limit) break;
  }

  // Sort by priority and trim
  out.sort((a, b) => b.priority - a.priority);
  return out.slice(0, limit);
}

function clusterToSignal(c: ClusterBuy): Signal {
  const ceoCfo = c.insiders.filter((i) => i.role === "CEO" || i.role === "CFO").length;
  const titleSuffix =
    c.insiderCount >= 4
      ? `${c.insiderCount} insiders bought together`
      : ceoCfo >= 1
      ? `${c.insiderCount} insiders, including ${ceoCfo === 2 ? "the CEO and CFO" : "the " + (c.insiders.find((i) => i.role === "CEO")?.role ?? c.insiders.find((i) => i.role === "CFO")?.role)}`
      : `${c.insiderCount} insiders bought together`;
  return {
    ticker: c.ticker,
    company: c.company,
    title: titleSuffix,
    rationale: "Cluster buys are the strongest documented insider signal in published research — start here.",
    metric: formatUsd(c.totalDollars),
    metricLabel: "combined",
    priority: 100 + c.strength,
    kind: "cluster",
  };
}

function roleToSignal(r: LeaderboardRow): Signal {
  const stakeNote = r.stakePctChange >= 5
    ? `, lifting their existing stake by +${r.stakePctChange.toFixed(0)}%`
    : "";
  return {
    ticker: r.ticker,
    company: r.company,
    title: `${r.role === "CEO" ? "CEO" : "CFO"} bought ${formatUsd(r.dollars)} of their own company's stock${stakeNote}`,
    rationale: r.role === "CEO"
      ? "C-suite open-market purchases carry above-average forward returns in the academic literature."
      : "CFO open-market buys are rare and historically informative — CFOs sit closest to the financial picture.",
    metric: `${r.significance}/100`,
    metricLabel: "conviction",
    priority: 60 + r.significance,
    kind: r.role === "CEO" ? "ceo" : "cfo",
  };
}

function stakeToSignal(r: LeaderboardRow): Signal {
  return {
    ticker: r.ticker,
    company: r.company,
    title: `Insider increased their position by +${r.stakePctChange.toFixed(0)}% in a single trade`,
    rationale: "Large percentage stake increases — relative to existing holdings — historically carry more signal than absolute dollar amounts.",
    metric: `+${r.stakePctChange.toFixed(0)}%`,
    metricLabel: "stake change",
    priority: 40 + Math.min(40, r.stakePctChange),
    kind: "ratio",
  };
}

function scaleToSignal(r: LeaderboardRow): Signal {
  return {
    ticker: r.ticker,
    company: r.company,
    title: `${r.role} bought ${formatUsd(r.dollars)} of their own company's stock`,
    rationale: "Large open-market purchases are worth a closer look even outside the cluster pattern — especially when the buyer is a senior officer.",
    metric: formatUsd(r.dollars),
    metricLabel: "size",
    priority: 20 + Math.min(40, Math.log10(r.dollars) * 5),
    kind: "scale",
  };
}
