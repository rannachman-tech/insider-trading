/**
 * Ticker-level aggregation of leaderboard rows.
 *
 * The raw leaderboard collapses by (ticker × insider), so MOBI with 5
 * buying insiders shows 5 rows and a single-insider buying 12 times shows
 * 1 row. Reviewer feedback ("convert transactions → signal objects") asked
 * us to take one more step: group at the TICKER level, so the user reads
 * the dashboard as "12 signals worth watching" instead of "20 buys to
 * scroll through."
 *
 * The aggregation here is purely a view transform — no persisted state
 * change, no snapshot-schema change. The drawer expands the group back
 * into per-insider detail.
 */

import type { LeaderboardRow, InsiderRole, InsiderTransaction } from "./types";

const ROLE_RANK: Record<InsiderRole, number> = {
  CEO: 10,
  CFO: 9,
  President: 8,
  COO: 7,
  Chair: 6,
  "10%Owner": 5,
  Director: 3,
  Officer: 2,
  Other: 1,
};

export interface SignalGroup {
  rank: number;
  ticker: string;
  company: string;
  sector: string;
  /** Distinct insiders ranked by role / dollars (descending). */
  rows: LeaderboardRow[];
  /** Lead insider (highest-weighted role, dollar tiebreaker). */
  lead: LeaderboardRow;
  insiderCount: number;
  /** Total real transactions across all insiders. */
  buyCount: number;
  /** Calendar-day span of all transactions, inclusive. */
  daysSpan: number;
  /** ISO date of the most recent fill. */
  latestDate: string;
  /** Sum of dollars across all insider rows. */
  totalDollars: number;
  /** Highest-weighted role present (CEO > CFO > … > Other). */
  topRole: InsiderRole;
  /** Lead insider's significance (0-100) — drives the conviction bar. */
  significance: number;
  /**
   * True when 3+ distinct insiders bought the ticker — this is a
   * "cluster" by the same definition used in snapshot.clusters.
   */
  isCluster: boolean;
  /**
   * True when a single insider has built a position through repeated
   * buying — distinct from a cluster, but the second-strongest insider
   * signal type (Lakonishok & Lee 2001 on buying intensity).
   *
   * Threshold: 1 insider × (≥5 transactions OR ≥$5M total) in ≤10 days.
   * The dollar floor catches the "one big stakeholder built a $46M
   * position over a week" case (WGS, etc.) even if the buy count is
   * lower than 5.
   */
  isAccumulation: boolean;
}

/** Aggregate rows by ticker, ranked by lead-insider significance desc. */
export function aggregateByTicker(rows: LeaderboardRow[]): SignalGroup[] {
  const byTicker = new Map<string, LeaderboardRow[]>();
  for (const r of rows) {
    const arr = byTicker.get(r.ticker) ?? [];
    arr.push(r);
    byTicker.set(r.ticker, arr);
  }

  const groups: SignalGroup[] = [];
  for (const [ticker, tickerRows] of byTicker) {
    // Sort sub-rows by (role weight desc, dollars desc) so the lead is first
    const sorted = [...tickerRows].sort((a, b) => {
      const rd = (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0);
      if (rd !== 0) return rd;
      return b.dollars - a.dollars;
    });
    const lead = sorted[0];

    const allTxs: InsiderTransaction[] = sorted.flatMap((r) => r.transactions);
    const daysSpan = txDaySpan(allTxs);
    const latestDate = allTxs
      .map((t) => t.transactionDate)
      .sort()
      .at(-1) ?? lead.transactions[0]?.transactionDate ?? "";
    const totalDollars = sorted.reduce((s, r) => s + r.dollars, 0);
    const topRole = sorted.reduce(
      (best, r) => ((ROLE_RANK[r.role] ?? 0) > (ROLE_RANK[best] ?? 0) ? r.role : best),
      "Other" as InsiderRole
    );

    const isCluster = sorted.length >= 3;
    // Accumulation = single insider building a position through repeated
    // buying within a tight window. Don't double-label: a cluster IS a
    // cluster, not an accumulation pattern.
    const isAccumulation =
      !isCluster &&
      sorted.length === 1 &&
      daysSpan <= 10 &&
      (allTxs.length >= 5 || totalDollars >= 5_000_000);

    groups.push({
      rank: 0, // assigned after sort
      ticker,
      company: lead.company,
      sector: lead.sector,
      rows: sorted,
      lead,
      insiderCount: sorted.length,
      buyCount: allTxs.length,
      daysSpan,
      latestDate,
      totalDollars,
      topRole,
      significance: lead.significance,
      isCluster,
      isAccumulation,
    });
  }

  // Rank by lead significance desc, dollars desc as tiebreaker
  groups.sort((a, b) => b.significance - a.significance || b.totalDollars - a.totalDollars);
  groups.forEach((g, i) => {
    g.rank = i + 1;
  });
  return groups;
}

function txDaySpan(txs: InsiderTransaction[]): number {
  if (txs.length === 0) return 1;
  const ts = txs.map((t) => new Date(t.transactionDate).getTime()).filter(Number.isFinite);
  if (!ts.length) return 1;
  const span = (Math.max(...ts) - Math.min(...ts)) / 86_400_000;
  return Math.max(1, Math.round(span) + 1);
}
