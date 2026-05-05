/**
 * Snapshot builder: takes a stream of parsed Form 4 transactions and produces
 * the InsiderSnapshot consumed by the UI.
 *
 * Pure function. Used by both the live ingest script and the seeded demo data.
 */

import {
  computeIndex,
  isRealBuy,
  isRealSell,
  significanceScore,
} from "./edgar";
import { phaseFor, PHASE_VERDICT } from "./phase";
import type {
  ClusterBuy,
  HistoryPoint,
  IndicatorTile,
  InsiderRole,
  InsiderSnapshot,
  InsiderTransaction,
  LeaderboardRow,
  SectorTile,
} from "./types";

interface BuildOptions {
  generatedAt: string;
  /** Rolling window in days for leaderboard + index. Defaults to 7. */
  windowDays?: number;
  /** Rolling window in days for cluster detection. Defaults to 30. */
  clusterWindowDays?: number;
  /** Minimum distinct insiders to qualify as a cluster. Defaults to 3. */
  clusterMinInsiders?: number;
  /** Optional 12-month history series (one entry per day, oldest → newest). */
  history?: HistoryPoint[];
  /** Mark snapshot as demo-seeded for the UI. */
  isDemo?: boolean;
}

const ROLE_RANK: Record<InsiderRole, number> = {
  CEO: 0,
  CFO: 1,
  President: 2,
  COO: 3,
  Chair: 4,
  Officer: 5,
  "10%Owner": 6,
  Director: 7,
  Other: 8,
};

const within = (iso: string, days: number, anchor: number): boolean => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return anchor - t <= days * 86_400_000;
};

export function buildSnapshot(
  transactions: InsiderTransaction[],
  opts: BuildOptions
): InsiderSnapshot {
  const anchor = new Date(opts.generatedAt).getTime();
  const windowDays = opts.windowDays ?? 7;
  const clusterWindowDays = opts.clusterWindowDays ?? 30;
  const clusterMin = opts.clusterMinInsiders ?? 3;

  const inWindow = (t: InsiderTransaction) =>
    within(t.transactionDate, windowDays, anchor);
  const inCluster = (t: InsiderTransaction) =>
    within(t.transactionDate, clusterWindowDays, anchor);

  const realBuys = transactions.filter((t) => isRealBuy(t) && inWindow(t));
  const realSells = transactions.filter((t) => isRealSell(t) && inWindow(t));
  const clusterBuysWindow = transactions.filter((t) => isRealBuy(t) && inCluster(t));

  // ---------- Leaderboard ----------
  type Key = string;
  const groups = new Map<Key, InsiderTransaction[]>();
  for (const t of realBuys) {
    const key = `${t.ticker}|${t.insiderName}`;
    const existing = groups.get(key);
    if (existing) existing.push(t);
    else groups.set(key, [t]);
  }

  const rows: LeaderboardRow[] = [];
  groups.forEach((txs) => {
    const totalDollars = txs.reduce((s, t) => s + t.dollars, 0);
    const totalShares = txs.reduce((s, t) => s + t.shares, 0);
    const avgPrice = totalShares > 0 ? totalDollars / totalShares : 0;
    const t0 = txs[0];
    const stakePctChange = txs.reduce((s, t) => s + t.stakePctChange, 0);
    const significance = significanceScore({
      dollars: totalDollars,
      role: t0.role,
      stakePctChange,
      is10b5One: t0.is10b5One,
      isCodeP: true,
    });
    rows.push({
      rank: 0,
      ticker: t0.ticker,
      company: t0.company,
      sector: t0.sector,
      insiderName: t0.insiderName,
      role: t0.role,
      officerTitle: t0.officerTitle,
      dollars: totalDollars,
      shares: totalShares,
      avgPricePerShare: avgPrice,
      stakePctChange,
      significance,
      transactions: txs,
    });
  });

  rows.sort((a, b) => b.significance - a.significance || b.dollars - a.dollars);
  const leaderboard = rows.slice(0, 20).map((r, i) => ({ ...r, rank: i + 1 }));

  // ---------- Clusters (use 30d window, not 7d) ----------
  const clusterMap = new Map<string, InsiderTransaction[]>();
  for (const t of clusterBuysWindow) {
    const list = clusterMap.get(t.ticker) ?? [];
    list.push(t);
    clusterMap.set(t.ticker, list);
  }
  const clusters: ClusterBuy[] = [];
  clusterMap.forEach((txs, ticker) => {
    const distinctNames = new Map<string, InsiderTransaction[]>();
    for (const t of txs) {
      const list = distinctNames.get(t.insiderName) ?? [];
      list.push(t);
      distinctNames.set(t.insiderName, list);
    }
    if (distinctNames.size < clusterMin) return;
    const insiders = Array.from(distinctNames.entries())
      .map(([name, list]) => ({
        name,
        role: list[0].role,
        officerTitle: list[0].officerTitle,
        dollars: list.reduce((s, t) => s + t.dollars, 0),
      }))
      .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);
    const totalDollars = txs.reduce((s, t) => s + t.dollars, 0);
    const latestDate = txs.reduce(
      (d, t) => (t.transactionDate > d ? t.transactionDate : d),
      ""
    );
    const t0 = txs[0];
    // Strength: 0–100, blends size, count, role weight
    const sizeFactor = Math.max(0, Math.min(1, Math.log10(Math.max(1000, totalDollars)) / 8 - 0.3));
    const countFactor = Math.min(1, distinctNames.size / 6);
    const roleFactor =
      Math.max(...insiders.map((i) => 1 - ROLE_RANK[i.role] / 8));
    const strength = Math.round(
      Math.max(0, Math.min(1, 0.4 * sizeFactor + 0.35 * countFactor + 0.25 * roleFactor)) * 100
    );
    clusters.push({
      ticker,
      company: t0.company,
      sector: t0.sector,
      insiderCount: distinctNames.size,
      insiders,
      totalDollars,
      windowDays: clusterWindowDays,
      latestDate,
      strength,
    });
  });
  clusters.sort((a, b) => b.strength - a.strength || b.totalDollars - a.totalDollars);

  // ---------- Sector heatmap ----------
  const sectorMap = new Map<string, SectorTile>();
  for (const t of realBuys) {
    const tile = sectorMap.get(t.sector) ?? {
      sector: t.sector,
      buyDollars: 0,
      sellDollars: 0,
      netRatio: 0,
      buyCount: 0,
      sellCount: 0,
    };
    tile.buyDollars += t.dollars;
    tile.buyCount += 1;
    sectorMap.set(t.sector, tile);
  }
  for (const t of realSells) {
    const tile = sectorMap.get(t.sector) ?? {
      sector: t.sector,
      buyDollars: 0,
      sellDollars: 0,
      netRatio: 0,
      buyCount: 0,
      sellCount: 0,
    };
    tile.sellDollars += t.dollars;
    tile.sellCount += 1;
    sectorMap.set(t.sector, tile);
  }
  const sectors = Array.from(sectorMap.values()).map((s) => {
    const total = s.buyDollars + s.sellDollars;
    return { ...s, netRatio: total > 0 ? (s.buyDollars - s.sellDollars) / total : 0 };
  });
  sectors.sort((a, b) => b.netRatio - a.netRatio);

  // ---------- Index + verdict ----------
  const buyDollars = realBuys.reduce((s, t) => s + t.dollars, 0);
  const sellDollars = realSells.reduce((s, t) => s + t.dollars, 0);
  const netDollars = buyDollars - sellDollars;
  const idx = computeIndex({
    buyDollars,
    sellDollars,
    buyCount: realBuys.length,
    sellCount: realSells.length,
    clusterCount: clusters.length,
  });
  const phase = phaseFor(idx);

  // ---------- Indicators row ----------
  const topRoleBuyer = leaderboard.find((r) => r.role === "CEO" || r.role === "CFO");
  const indicators: IndicatorTile[] = [
    {
      label: "Cluster buys (30d)",
      value: String(clusters.length),
      sub: clusters.length === 0 ? "No clusters this month" : `Across ${new Set(clusters.map((c) => c.sector)).size} sectors`,
      tone: clusters.length >= 5 ? "positive" : clusters.length >= 2 ? "neutral" : "warning",
    },
    {
      label: "Net buy/sell ($)",
      value: formatNetDollars(netDollars),
      sub: `${realBuys.length} buys vs ${realSells.length} sells`,
      tone: netDollars > 0 ? "positive" : netDollars < 0 ? "negative" : "neutral",
    },
    {
      label: "Top conviction (this week)",
      value: topRoleBuyer ? topRoleBuyer.ticker : leaderboard[0]?.ticker ?? "—",
      sub: topRoleBuyer
        ? `${topRoleBuyer.role} · ${shortDollars(topRoleBuyer.dollars)}`
        : leaderboard[0]
        ? `${leaderboard[0].role} · ${shortDollars(leaderboard[0].dollars)}`
        : "Tape is quiet",
      tone: "neutral",
    },
    {
      label: "Sector tilt",
      value: sectors[0]?.sector ?? "—",
      sub: sectors[0] ? `Net ratio ${(sectors[0].netRatio * 100).toFixed(0)}%` : "—",
      tone: "neutral",
    },
  ];

  // ---------- Sources health ----------
  const sources = [
    { name: "SEC EDGAR Form 4", ok: true, note: "Public filings · refreshed daily" },
    { name: "EDGAR ticker map", ok: true, note: "company_tickers.json — issuer→ticker resolution" },
    { name: "eToro public catalog", ok: true, note: "Instrument tradability · 15,500 names" },
  ];

  // ---------- Filter transparency ----------
  // Count what was excluded BEFORE the isRealBuy/isRealSell filter so users
  // can see the cleanup discipline.
  const filtered = {
    grantsAndAwards: transactions.filter((t) => t.code === "A").length,
    optionExercises: transactions.filter((t) => t.code === "M" || t.code === "X").length,
    taxWithholding: transactions.filter((t) => t.code === "F").length,
    preScheduledSales: transactions.filter((t) => t.is10b5One && (t.code === "S" || t.code === "P")).length,
    belowThreshold: transactions.filter(
      (t) =>
        (t.code === "P" || t.code === "S") &&
        !t.is10b5One &&
        t.dollars > 0 &&
        t.dollars < 25_000
    ).length,
  };

  // ---------- Recent activity ----------
  const recentActivity = [...realBuys, ...realSells]
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, 6)
    .map((t) => ({
      ticker: t.ticker,
      company: t.company,
      insiderName: t.insiderName,
      role: t.role,
      isBuy: t.code === "P",
      dollars: t.dollars,
      transactionDate: t.transactionDate,
    }));

  return {
    generatedAt: opts.generatedAt,
    windowDays,
    index: idx,
    phase,
    verdict: PHASE_VERDICT[phase],
    netDollars,
    buyDollars,
    sellDollars,
    buyCount: realBuys.length,
    sellCount: realSells.length,
    clusterCount: clusters.length,
    leaderboard,
    clusters: clusters.slice(0, 12),
    sectors,
    history: opts.history ?? [],
    indicators,
    sources,
    isDemo: opts.isDemo ?? false,
    filtered,
    recentActivity,
  };
}

const shortDollars = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
};

const formatNetDollars = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};
