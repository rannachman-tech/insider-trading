/**
 * Per-phase tradeable baskets.
 *
 * Heavy-buying baskets are now BUILT FROM THE LIVE SNAPSHOT — pulling the top
 * names from cluster buys + the largest single-name CEO/CFO conviction trade
 * — so the basket always reflects what the leaderboard above is showing. No
 * more "NVDA is top conviction but absent from the basket" mismatch.
 *
 * Balanced and heavy-selling baskets remain curated hedge templates: when
 * insiders aren't telegraphing a tactical bet, you don't want to chase the
 * most-recent-buy, you want a quality/defensive overlay.
 *
 * Every instrumentId is resolved against the live eToro public catalog at
 * build time and re-validated by scripts/verify-baskets.mjs.
 */

import { lookupStock } from "./stock-catalog";
import type { InsiderSnapshot, Phase, ClusterBuy, LeaderboardRow } from "./types";

export interface BasketHolding {
  ticker: string;
  symbolFull: string;
  instrumentId: number;
  name: string;
  weight: number;
  shortRationale: string;
  longRationale: string;
}

export interface Basket {
  phase: Phase;
  title: string;
  thesis: string;
  /** Optional source note ("built from this week's clusters", etc.) */
  sourceNote?: string;
  holdings: BasketHolding[];
}

/* ------------------------------------------------------------------ */
/* Curated baskets for balanced + heavy-selling phases.               */
/* ------------------------------------------------------------------ */

const BALANCED_TEMPLATE: Basket = {
  phase: "balanced",
  title: "Educational allocation · mixed-signal regime",
  thesis:
    "An illustrative diversified holding for periods when insider activity sends a mixed signal. Not personalised advice, not a recommendation — a teaching example showing what a quality-tilted, broad-market exposure typically looks like.",
  sourceNote: "Curated educational template — not regenerated from this week's tape.",
  holdings: [
    {
      ticker: "VTI",
      symbolFull: "VTI",
      instrumentId: 4237,
      name: "Vanguard Total Stock Market ETF",
      weight: 35,
      shortRationale: "Broad US equity",
      longRationale: "Total-market core. A balanced phase isn't a stockpicker's tape.",
    },
    {
      ticker: "DGRO",
      symbolFull: "DGRO",
      instrumentId: 3149,
      name: "iShares Core Dividend Growth ETF",
      weight: 25,
      shortRationale: "Quality dividend tilt",
      longRationale:
        "Quality dividend growers screen well in mixed regimes — cheaper than VYM, with higher buyback intensity.",
    },
    {
      ticker: "WMT",
      symbolFull: "WMT",
      instrumentId: 1035,
      name: "Walmart Inc.",
      weight: 20,
      shortRationale: "Defensive with rare CFO buy",
      longRationale:
        "Walmart's CFO bought open-market stock for the first time in 4 years — specific, role-weighted conviction at a defensive name.",
    },
    {
      ticker: "COST",
      symbolFull: "COST",
      instrumentId: 1461,
      name: "Costco Wholesale Corporation",
      weight: 20,
      shortRationale: "Director buy at highs",
      longRationale:
        "Costco saw its founding director buy near all-time highs — directional confidence in spite of valuation.",
    },
  ],
};

const HEAVY_SELLING_TEMPLATE: Basket = {
  phase: "heavy-selling",
  title: "Educational allocation · cautious regime",
  thesis:
    "An illustrative defensive-tilt holding for periods when insiders are broadly net-selling. Not personalised advice — a teaching example of how a defensive overlay (cash, gold, low-volatility, duration) is typically constructed during cautious regimes.",
  sourceNote: "Curated educational template — not regenerated from this week's tape.",
  holdings: [
    {
      ticker: "SHV",
      symbolFull: "SHV",
      instrumentId: 4321,
      name: "iShares Short Treasury Bond ETF",
      weight: 30,
      shortRationale: "Cash-equivalent yield",
      longRationale: "Earn while you wait. Sub-3-month duration, near-zero rate risk.",
    },
    {
      ticker: "IAU",
      symbolFull: "IAU",
      instrumentId: 4365,
      name: "iShares Gold Trust",
      weight: 25,
      shortRationale: "Gold hedge",
      longRationale: "Standard de-risking ballast when insiders trim into strength.",
    },
    {
      ticker: "USMV",
      symbolFull: "USMV",
      instrumentId: 4292,
      name: "iShares MSCI USA Min Vol Factor ETF",
      weight: 25,
      shortRationale: "Low-volatility US",
      longRationale: "Stay invested but on the low-vol factor — historically outperforms in heavy-selling regimes.",
    },
    {
      ticker: "TLT",
      symbolFull: "TLT",
      instrumentId: 3020,
      name: "iShares 20+ Year Treasury Bond ETF",
      weight: 20,
      shortRationale: "Long duration",
      longRationale: "Duration as a hedge against the recession scenario insider selling sometimes telegraphs.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Heavy-buying basket — built from the live snapshot.                */
/* ------------------------------------------------------------------ */

interface BuildOpts {
  /** Max holdings (default 5) */
  maxHoldings?: number;
  /** Single-position cap percentage (default 35) */
  maxWeight?: number;
  /** Min single-position floor (default 10) */
  minWeight?: number;
}

/**
 * Compose the heavy-buying basket from the snapshot:
 *   1. Anchor names = the top cluster buys (3+ insiders) sorted by strength
 *   2. Single-name lead = the highest-significance CEO/CFO single trade
 *      that isn't already in the cluster anchors
 *   3. Weight by significance, normalize to 100, cap concentration
 *
 * Falls back to a defensive template only if the snapshot has nothing usable.
 */
export function buildHeavyBuyingBasket(
  snapshot: InsiderSnapshot,
  opts: BuildOpts = {}
): Basket {
  const maxHoldings = opts.maxHoldings ?? 5;
  const maxWeight = opts.maxWeight ?? 35;
  const minWeight = opts.minWeight ?? 10;

  const candidates: Array<{
    ticker: string;
    company: string;
    weight: number;
    shortRationale: string;
    longRationale: string;
  }> = [];

  // Pull cluster anchors first (capitalize on the strongest documented signal)
  for (const c of snapshot.clusters) {
    if (candidates.length >= maxHoldings) break;
    candidates.push({
      ticker: c.ticker,
      company: c.company,
      weight: Math.max(1, c.strength),
      shortRationale: clusterShort(c),
      longRationale: clusterLong(c),
    });
  }

  // Then add top single-name CEO/CFO conviction trades not already covered
  for (const r of snapshot.leaderboard) {
    if (candidates.length >= maxHoldings) break;
    if (candidates.find((x) => x.ticker === r.ticker)) continue;
    if (r.role !== "CEO" && r.role !== "CFO") continue;
    candidates.push({
      ticker: r.ticker,
      company: r.company,
      weight: Math.max(1, r.significance),
      shortRationale: singleShort(r),
      longRationale: singleLong(r),
    });
  }

  // Drop any tickers we don't have a verified eToro instrumentId for
  const tradeable = candidates
    .map((c) => ({ ...c, stock: lookupStock(c.ticker) }))
    .filter((c): c is typeof c & { stock: NonNullable<ReturnType<typeof lookupStock>> } => c.stock !== null);

  if (tradeable.length === 0) {
    // Defensive fallback — should never hit in normal use
    return {
      ...BALANCED_TEMPLATE,
      phase: "heavy-buying",
      title: "Mirror cluster buys (no tradeable names yet)",
      thesis: "We'll regenerate this basket as soon as live ingest produces tradeable names with verified eToro instruments.",
    };
  }

  // Normalize weights → sum to 100, respecting concentration caps
  const totalRaw = tradeable.reduce((s, c) => s + c.weight, 0);
  let normalized = tradeable.map((c) => ({
    ...c,
    weight: Math.max(minWeight, Math.min(maxWeight, (c.weight / totalRaw) * 100)),
  }));
  // Re-normalize after caps so weights still sum to 100
  const sumAfterCaps = normalized.reduce((s, c) => s + c.weight, 0);
  normalized = normalized.map((c) => ({
    ...c,
    weight: Math.round((c.weight / sumAfterCaps) * 100),
  }));
  // Drift fix: ensure the rounded weights still sum to exactly 100
  const drift = 100 - normalized.reduce((s, c) => s + c.weight, 0);
  if (drift !== 0 && normalized.length) normalized[0].weight += drift;

  const holdings: BasketHolding[] = normalized.map((c) => ({
    ticker: c.stock.ticker,
    symbolFull: c.stock.symbolFull,
    instrumentId: c.stock.instrumentId,
    name: c.stock.name,
    weight: c.weight,
    shortRationale: c.shortRationale,
    longRationale: c.longRationale,
  }));

  return {
    phase: "heavy-buying",
    title: "This week's most-bought-by-insiders names",
    thesis:
      "Names where multiple insiders bought their own stock with personal cash this week — anchored on the strongest cluster buys, augmented by the single largest CEO/CFO trade. Equal-weight illustration, no leverage, concentration capped at " + maxWeight + "%. Educational only — not personalised advice.",
    sourceNote: `Rebuilt from snapshot · ${snapshot.clusters.length} cluster${snapshot.clusters.length === 1 ? "" : "s"}, ${holdings.length} holding${holdings.length === 1 ? "" : "s"}`,
    holdings,
  };
}

const clusterShort = (c: ClusterBuy) => {
  const ceoOrCfo = c.insiders.some((i) => i.role === "CEO" || i.role === "CFO");
  if (c.insiderCount >= 4) return `${c.insiderCount} insiders bought together`;
  if (ceoOrCfo) return `${c.insiderCount} insiders, CEO/CFO led`;
  return `${c.insiderCount} insiders bought together`;
};

const clusterLong = (c: ClusterBuy) => {
  const top = c.insiders[0];
  return `${c.insiderCount} insiders bought ${c.ticker} in the last 30 days, led by ${top.role === "CEO" || top.role === "CFO" ? "the " + top.role : top.name}. Combined dollar conviction: significant.`;
};

const singleShort = (r: LeaderboardRow) => {
  if (r.role === "CEO") return `CEO bought their own company's stock`;
  if (r.role === "CFO") return `CFO bought their own company's stock`;
  return `${r.role} buy`;
};

const singleLong = (r: LeaderboardRow) => {
  return `${r.insiderName} (${r.officerTitle ?? r.role}) bought ${r.ticker} this week — meaningful personal cash committed.`;
};

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Get the right basket for a snapshot. Heavy-buying is dynamic from the
 * snapshot's actual top conviction names; balanced and heavy-selling
 * remain curated hedge templates.
 */
export function basketFor(snapshot: InsiderSnapshot): Basket {
  if (snapshot.phase === "heavy-buying") return buildHeavyBuyingBasket(snapshot);
  if (snapshot.phase === "balanced") return BALANCED_TEMPLATE;
  return HEAVY_SELLING_TEMPLATE;
}

/**
 * All known holdings across the curated baskets — used by the verifier.
 * The dynamic heavy-buying basket sources from STOCK_CATALOG which is
 * verified separately in the same script.
 */
export function allCuratedHoldings(): BasketHolding[] {
  return [...BALANCED_TEMPLATE.holdings, ...HEAVY_SELLING_TEMPLATE.holdings];
}

export function allocate(basket: Basket, amount: number) {
  return basket.holdings.map((h) => ({
    ...h,
    dollars: Math.round((h.weight / 100) * amount * 100) / 100,
  }));
}
