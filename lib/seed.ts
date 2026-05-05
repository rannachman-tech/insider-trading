/**
 * Demo seeder — produces a deterministic "what a real week of Code-P insider
 * activity looks like" dataset, calibrated to read in the heavy-buying phase.
 * Used at first paint and as a fallback when live ingest is unavailable.
 */

import type { InsiderRole, InsiderTransaction } from "./types";

interface SeedTx {
  ticker: string;
  company: string;
  sector: string;
  insider: string;
  role: InsiderRole;
  title?: string;
  daysAgo: number;
  shares: number;
  price: number;
  sharesAfter: number;
  is10b5One?: boolean;
  isSell?: boolean;
}

// 7 days of Code-P buys + a sprinkle of sells. Not real filings — but
// shaped like real ones (cluster around a few names, mostly mid-caps,
// CEO/CFO concentration on the heavy hitters).
const SEED: SeedTx[] = [
  // --- DKNG: 4-insider cluster (the moment-of-identity for v1) ---
  { ticker: "DKNG", company: "DraftKings Inc.", sector: "Consumer Discretionary",
    insider: "Robins Jason D", role: "CEO", title: "Chief Executive Officer",
    daysAgo: 2, shares: 90000, price: 38.40, sharesAfter: 4_120_000 },
  { ticker: "DKNG", company: "DraftKings Inc.", sector: "Consumer Discretionary",
    insider: "Park Jason", role: "CFO", title: "Chief Financial Officer",
    daysAgo: 3, shares: 26000, price: 38.10, sharesAfter: 318_400 },
  { ticker: "DKNG", company: "DraftKings Inc.", sector: "Consumer Discretionary",
    insider: "Sadusky Matt", role: "Director", title: "Director",
    daysAgo: 5, shares: 7800, price: 37.85, sharesAfter: 64_500 },
  { ticker: "DKNG", company: "DraftKings Inc.", sector: "Consumer Discretionary",
    insider: "Howe Jocelyn", role: "Officer", title: "Chief People Officer",
    daysAgo: 6, shares: 5400, price: 37.70, sharesAfter: 41_200 },

  // --- WMT: First open-market CFO buy in 4 years (the "rare CFO buy" hero card) ---
  { ticker: "WMT", company: "Walmart Inc.", sector: "Consumer Staples",
    insider: "Rainey John David", role: "CFO", title: "Executive Vice President and Chief Financial Officer",
    daysAgo: 1, shares: 8900, price: 81.20, sharesAfter: 71_400 },

  // --- NVDA: large CEO buy ---
  { ticker: "NVDA", company: "NVIDIA Corporation", sector: "Information Technology",
    insider: "Huang Jen-Hsun", role: "CEO", title: "President and CEO",
    daysAgo: 4, shares: 95000, price: 119.40, sharesAfter: 856_000_000 },

  // --- COST: Director buy ---
  { ticker: "COST", company: "Costco Wholesale Corp.", sector: "Consumer Staples",
    insider: "Sinegal James D", role: "Director", title: "Director (former CEO)",
    daysAgo: 1, shares: 2200, price: 905.00, sharesAfter: 8_400 },

  // --- PYPL: 3-insider cluster ---
  { ticker: "PYPL", company: "PayPal Holdings, Inc.", sector: "Financials",
    insider: "Chriss Alex", role: "CEO", title: "President and CEO",
    daysAgo: 3, shares: 28000, price: 70.10, sharesAfter: 410_000 },
  { ticker: "PYPL", company: "PayPal Holdings, Inc.", sector: "Financials",
    insider: "Miller Jamie", role: "CFO", title: "Chief Financial Officer",
    daysAgo: 4, shares: 14000, price: 70.40, sharesAfter: 96_400 },
  { ticker: "PYPL", company: "PayPal Holdings, Inc.", sector: "Financials",
    insider: "Wadhwani Suresh", role: "Officer", title: "Chief Product Officer",
    daysAgo: 6, shares: 8600, price: 69.75, sharesAfter: 52_300 },

  // --- ENPH: cluster across 3 directors + CFO ---
  { ticker: "ENPH", company: "Enphase Energy, Inc.", sector: "Information Technology",
    insider: "Kothandaraman Badrinarayanan", role: "CEO", title: "President and CEO",
    daysAgo: 5, shares: 21000, price: 64.20, sharesAfter: 215_000 },
  { ticker: "ENPH", company: "Enphase Energy, Inc.", sector: "Information Technology",
    insider: "Martin Mandy", role: "CFO", title: "Chief Financial Officer",
    daysAgo: 5, shares: 6500, price: 63.95, sharesAfter: 38_400 },
  { ticker: "ENPH", company: "Enphase Energy, Inc.", sector: "Information Technology",
    insider: "Rangarajan Raghu", role: "Director", title: "Director",
    daysAgo: 7, shares: 4200, price: 63.10, sharesAfter: 21_700 },

  // --- LULU: CEO + 10% owner ---
  { ticker: "LULU", company: "Lululemon Athletica Inc.", sector: "Consumer Discretionary",
    insider: "McDonald Calvin", role: "CEO", title: "Chief Executive Officer",
    daysAgo: 6, shares: 4800, price: 248.00, sharesAfter: 142_300 },

  // --- UAL: First insider buy in 12 months (rare-event card) ---
  { ticker: "UAL", company: "United Airlines Holdings, Inc.", sector: "Industrials",
    insider: "Hart Scott", role: "Officer", title: "Chief Operations Officer",
    daysAgo: 2, shares: 6200, price: 92.40, sharesAfter: 38_500 },

  // --- AFRM ---
  { ticker: "AFRM", company: "Affirm Holdings, Inc.", sector: "Financials",
    insider: "Levchin Max", role: "CEO", title: "Founder, CEO and Chair",
    daysAgo: 3, shares: 18000, price: 51.20, sharesAfter: 8_120_000 },

  // --- KMI ---
  { ticker: "KMI", company: "Kinder Morgan, Inc.", sector: "Energy",
    insider: "Kim Richard", role: "CFO", title: "Executive Vice President and Chief Financial Officer",
    daysAgo: 4, shares: 22500, price: 24.10, sharesAfter: 168_900 },

  // --- BAC director buy ---
  { ticker: "BAC", company: "Bank of America Corp.", sector: "Financials",
    insider: "Bessent Frank P", role: "Director", title: "Director",
    daysAgo: 5, shares: 9000, price: 41.20, sharesAfter: 24_800 },

  // --- F: smaller cluster ---
  { ticker: "F", company: "Ford Motor Company", sector: "Consumer Discretionary",
    insider: "Farley James D Jr.", role: "CEO", title: "President and CEO",
    daysAgo: 2, shares: 32000, price: 9.85, sharesAfter: 1_320_000 },
  { ticker: "F", company: "Ford Motor Company", sector: "Consumer Discretionary",
    insider: "Lawler John", role: "CFO", title: "Chief Financial Officer",
    daysAgo: 4, shares: 14500, price: 9.92, sharesAfter: 218_400 },

  // --- CRWD: large 10% owner buy ---
  { ticker: "CRWD", company: "CrowdStrike Holdings, Inc.", sector: "Information Technology",
    insider: "Kurtz George R", role: "CEO", title: "President and CEO",
    daysAgo: 3, shares: 4800, price: 295.00, sharesAfter: 12_840_000 },

  // --- ABBV ---
  { ticker: "ABBV", company: "AbbVie Inc.", sector: "Health Care",
    insider: "Gonzalez Richard A", role: "Chair", title: "Executive Chair",
    daysAgo: 5, shares: 1800, price: 192.50, sharesAfter: 1_104_500 },

  // --- SOFI: Director buy ---
  { ticker: "SOFI", company: "SoFi Technologies, Inc.", sector: "Financials",
    insider: "Schwimmer Carlos", role: "Director", title: "Director",
    daysAgo: 6, shares: 14000, price: 9.10, sharesAfter: 84_300 },

  // --- A few real sells (not 10b5-1) — CFO trims, smaller dollars ---
  { ticker: "META", company: "Meta Platforms, Inc.", sector: "Communication Services",
    insider: "Olivan Javier", role: "COO", title: "Chief Operating Officer",
    daysAgo: 1, shares: 8500, price: 502.00, sharesAfter: 192_400, isSell: true },
  { ticker: "AMZN", company: "Amazon.com, Inc.", sector: "Consumer Discretionary",
    insider: "Galetti Beth", role: "Officer", title: "SVP People Experience",
    daysAgo: 3, shares: 4400, price: 187.40, sharesAfter: 41_200, isSell: true },
  { ticker: "ORCL", company: "Oracle Corporation", sector: "Information Technology",
    insider: "Gutierrez Brian", role: "Officer", title: "Vice President, Controller",
    daysAgo: 4, shares: 9200, price: 138.50, sharesAfter: 24_500, isSell: true },
  { ticker: "TSLA", company: "Tesla, Inc.", sector: "Consumer Discretionary",
    insider: "Taneja Vaibhav", role: "CFO", title: "Chief Financial Officer",
    daysAgo: 5, shares: 7000, price: 247.00, sharesAfter: 38_900, isSell: true },
];

export function buildSeedTransactions(generatedAtIso: string): InsiderTransaction[] {
  const anchor = new Date(generatedAtIso).getTime();
  return SEED.map((s, i) => {
    const dt = new Date(anchor - s.daysAgo * 86_400_000);
    const transactionDate = dt.toISOString().slice(0, 10);
    const filingDate = new Date(anchor - Math.max(0, s.daysAgo - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const dollars = s.shares * s.price;
    return {
      accession: `SEED-${String(i + 1).padStart(6, "0")}`,
      ticker: s.ticker,
      company: s.company,
      issuerCik: `0000${i + 100000}`,
      sector: s.sector,
      insiderName: s.insider,
      role: s.role,
      officerTitle: s.title,
      transactionDate,
      filingDate,
      code: s.isSell ? "S" : "P",
      acquiredDisposed: s.isSell ? "D" : "A",
      is10b5One: s.is10b5One ?? false,
      shares: s.shares,
      pricePerShare: s.price,
      dollars,
      sharesOwnedAfter: s.sharesAfter,
      stakePctChange: s.sharesAfter > 0 ? (s.shares / s.sharesAfter) * 100 : 0,
      ownership: "D",
    };
  });
}

/**
 * Build a 365-day history series whose values would, if compounded with
 * realistic noise, end at the snapshot's current index.
 */
export function buildSeedHistory(endIso: string, currentIndex: number) {
  const points: { date: string; index: number; netDollars: number }[] = [];
  const end = new Date(endIso).getTime();
  // Deterministic pseudo-random — same seed every build
  let seed = 0xc0ffee;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  let v = 50;
  for (let d = 365; d >= 0; d--) {
    const t = end - d * 86_400_000;
    const noise = (rand() - 0.5) * 4;
    // Slow drift toward currentIndex over the last 60 days
    const drift = d < 60 ? (currentIndex - v) * 0.05 : (50 - v) * 0.01;
    v = Math.max(10, Math.min(95, v + drift + noise));
    const netDollars = (v - 50) * 4_000_000 + (rand() - 0.5) * 12_000_000;
    points.push({
      date: new Date(t).toISOString().slice(0, 10),
      index: Math.round(v),
      netDollars: Math.round(netDollars),
    });
  }
  // Force the last point to match exactly
  if (points.length) points[points.length - 1].index = currentIndex;
  return points;
}
