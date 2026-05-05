/**
 * Per-phase tradeable baskets, with instrumentIds pre-resolved from the
 * eToro public catalog (https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments).
 *
 * Editorial logic:
 *   heavy-buying  → "Mirror cluster buys" — equal-weight names with documented
 *                   3+-insider clusters in the last 30d (DKNG, PYPL, ENPH, F).
 *                   In live mode this list is regenerated weekly from snapshot.clusters.
 *   balanced      → "Quality + insider-confidence" tilt — broad market with
 *                   defensive overlay, not a directional bet.
 *   heavy-selling → "Trim & hedge" — defensive, low-beta, gold + duration.
 *
 * Every instrumentId here was resolved against the public catalog at build
 * time. `npm run verify:baskets` re-checks them on every CI run.
 */

import type { Phase } from "./types";

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
  holdings: BasketHolding[];
}

const HEAVY_BUYING: Basket = {
  phase: "heavy-buying",
  title: "Mirror cluster buys",
  thesis:
    "Names where multiple insiders bought their own stock with personal cash in the last 30 days. Equal-weight, no leverage. Single largest position capped at 30%.",
  holdings: [
    {
      ticker: "DKNG",
      symbolFull: "DKNG",
      instrumentId: 7990,
      name: "DraftKings Inc.",
      weight: 25,
      shortRationale: "4 insiders bought, including CEO + CFO",
      longRationale:
        "DraftKings had a 4-insider Code-P cluster this month — CEO Jason Robins led, with the CFO and two officers backing him. Net dollar conviction skewed strongly to the C-suite.",
    },
    {
      ticker: "PYPL",
      symbolFull: "PYPL",
      instrumentId: 1484,
      name: "PayPal Holdings, Inc.",
      weight: 25,
      shortRationale: "3 insiders, CEO-led",
      longRationale:
        "PayPal saw a CEO + CFO + Chief Product Officer cluster. The CEO buy was the largest individual ticket of the cluster window.",
    },
    {
      ticker: "ENPH",
      symbolFull: "ENPH",
      instrumentId: 5634,
      name: "Enphase Energy, Inc.",
      weight: 25,
      shortRationale: "CEO + CFO + director",
      longRationale:
        "Enphase had a small but role-heavy cluster (CEO, CFO, director) inside a beaten-up sector — the kind of setup that historically produces the strongest cluster-buy returns.",
    },
    {
      ticker: "F",
      symbolFull: "F",
      instrumentId: 1112,
      name: "Ford Motor Company",
      weight: 25,
      shortRationale: "CEO + CFO buy",
      longRationale:
        "Ford had an unusually clean CEO + CFO cluster — both bought open-market stock above the prior week's average price.",
    },
  ],
};

const BALANCED: Basket = {
  phase: "balanced",
  title: "Quality + confirmation tilt",
  thesis:
    "When the insider tape is mixed, lean on quality names with at least one C-suite buy and broad-market exposure. Not a directional call.",
  holdings: [
    {
      ticker: "VTI",
      symbolFull: "VTI",
      instrumentId: 4237,
      name: "Vanguard Total Stock Market ETF",
      weight: 35,
      shortRationale: "Broad US equity",
      longRationale: "Total-market core. Balanced phase isn't a stockpicker's tape.",
    },
    {
      ticker: "DGRO",
      symbolFull: "DGRO",
      instrumentId: 3149,
      name: "iShares Core Dividend Growth ETF",
      weight: 25,
      shortRationale: "Quality dividend tilt",
      longRationale:
        "Quality dividend growers screen well during balanced regimes — cheaper than VYM, higher buyback intensity, and on the eToro catalog (VYM is not).",
    },
    {
      ticker: "WMT",
      symbolFull: "WMT",
      instrumentId: 1035,
      name: "Walmart Inc.",
      weight: 20,
      shortRationale: "Rare CFO open-market buy",
      longRationale:
        "Walmart's CFO bought open-market stock for the first time in 4 years. Specific, role-weighted conviction at a defensive name.",
    },
    {
      ticker: "COST",
      symbolFull: "COST",
      instrumentId: 1461,
      name: "Costco Wholesale Corporation",
      weight: 20,
      shortRationale: "Director buy at all-time highs",
      longRationale:
        "Costco saw its founding director buy open-market shares near all-time highs — directional confidence in spite of valuation.",
    },
  ],
};

const HEAVY_SELLING: Basket = {
  phase: "heavy-selling",
  title: "Trim and hedge",
  thesis:
    "When insiders are net-selling outside of 10b5-1 plans, lean defensive. Lower beta, duration, gold. Not a short basket — a hedge.",
  holdings: [
    {
      ticker: "SHV",
      symbolFull: "SHV",
      instrumentId: 4321,
      name: "iShares Short Treasury Bond ETF",
      weight: 30,
      shortRationale: "T-Bill cash equivalent",
      longRationale:
        "Cash-equivalent yield — earn while you wait. Sub-3-month duration, near-zero rate risk.",
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
      longRationale:
        "Stay invested but on the low-vol factor — historically outperforms the market in heavy-selling regimes.",
    },
    {
      ticker: "TLT",
      symbolFull: "TLT",
      instrumentId: 3020,
      name: "iShares 20+ Year Treasury Bond ETF",
      weight: 20,
      shortRationale: "Long duration",
      longRationale:
        "Duration as a hedge against the recession scenario insider selling sometimes telegraphs.",
    },
  ],
};

export const BASKETS: Record<Phase, Basket> = {
  "heavy-buying": HEAVY_BUYING,
  balanced: BALANCED,
  "heavy-selling": HEAVY_SELLING,
};

export function basketFor(phase: Phase): Basket {
  return BASKETS[phase];
}

export function allHoldings(): BasketHolding[] {
  return [
    ...HEAVY_BUYING.holdings,
    ...BALANCED.holdings,
    ...HEAVY_SELLING.holdings,
  ];
}

export function allocate(basket: Basket, amount: number) {
  return basket.holdings.map((h) => ({
    ...h,
    dollars: Math.round(((h.weight / 100) * amount) * 100) / 100,
  }));
}
