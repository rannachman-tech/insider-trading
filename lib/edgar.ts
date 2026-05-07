/**
 * EDGAR Form 4 parsing primitives.
 *
 * Used by both the ingest script (Node, runtime fetch) and the demo seeder.
 * Pure functions only — no I/O outside the explicit fetch helper.
 */

import type {
  InsiderRole,
  InsiderTransaction,
  TransactionCode,
} from "./types";

/** Required by SEC EDGAR — every request must declare a contact User-Agent. */
export const EDGAR_USER_AGENT =
  "Insiders Activity Compass research@insiders.compass.etoro.com";

export const EDGAR_HEADERS = {
  "User-Agent": EDGAR_USER_AGENT,
  Accept: "application/atom+xml,text/xml,application/xml,*/*;q=0.8",
};

/** SEC's atom feed of latest filings, filterable by form type. */
export const EDGAR_ATOM_URL = (form: "4" = "4", count = 100) =>
  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=${form}&dateb=&owner=include&count=${count}&output=atom`;

/** Map of CIK → ticker (normalized). */
export const CIK_TICKER_URL = "https://www.sec.gov/files/company_tickers.json";

/* ------------------------------------------------------------------ */
/* Role classification — drives weighting in the conviction index.    */
/* ------------------------------------------------------------------ */

const ROLE_WEIGHTS: Record<InsiderRole, number> = {
  CEO: 1.0,
  CFO: 0.95,
  President: 0.85,
  COO: 0.75,
  Chair: 0.7,
  Director: 0.45,
  Officer: 0.5,
  "10%Owner": 0.6,
  Other: 0.3,
};

export function roleWeight(role: InsiderRole): number {
  return ROLE_WEIGHTS[role] ?? 0.3;
}

export function classifyRole(input: {
  isOfficer: boolean;
  isDirector: boolean;
  isTenPercentOwner: boolean;
  officerTitle?: string;
}): InsiderRole {
  const t = (input.officerTitle ?? "").toLowerCase();
  if (input.isOfficer) {
    if (t.includes("chief executive") || /\bceo\b/.test(t)) return "CEO";
    if (t.includes("chief financial") || /\bcfo\b/.test(t)) return "CFO";
    if (t.includes("president")) return "President";
    if (t.includes("chief operating") || /\bcoo\b/.test(t)) return "COO";
    if (t.includes("chair")) return "Chair";
    return "Officer";
  }
  if (input.isTenPercentOwner) return "10%Owner";
  if (input.isDirector) return "Director";
  return "Other";
}

/* ------------------------------------------------------------------ */
/* Significance score — leaderboard ranking + index aggregation.      */
/* ------------------------------------------------------------------ */

/**
 * Composite 0–100 score for a single insider buy.
 *
 *   significance = sigmoid(log10($)) × roleWeight × stakeFactor × notRoutineFactor
 *
 * Calibrated so:
 *   $25k by a director:           ~10
 *   $500k by an Officer:          ~35
 *   $5M by the CFO:               ~75
 *   $10M+ by the CEO:             ~95
 *   3+ insiders cluster bonus is applied at the cluster level.
 */
export function significanceScore(input: {
  dollars: number;
  role: InsiderRole;
  stakePctChange: number;
  is10b5One: boolean;
  isCodeP: boolean;
}): number {
  if (!input.isCodeP || input.dollars <= 0) return 0;
  const logD = Math.log10(Math.max(1000, input.dollars)); // 3 → 8 typical
  const dollarFactor = Math.max(0, Math.min(1, (logD - 3) / 5));
  const roleW = roleWeight(input.role);
  const stakeFactor = Math.max(
    0.6,
    Math.min(1.4, 1 + Math.min(0.4, input.stakePctChange / 100))
  );
  const planFactor = input.is10b5One ? 0.55 : 1.0;
  const raw = dollarFactor * roleW * stakeFactor * planFactor;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

/* ------------------------------------------------------------------ */
/* Index — the headline 0–100 number under the hero.                  */
/* ------------------------------------------------------------------ */

/**
 * Insiders Activity Compass Index 0–100.
 *
 * Combines four signals, weighted toward the academically-strongest patterns:
 *   1. Net dollar flow      (30%) — the bedrock bidirectional signal
 *   2. Cluster buys         (30%) — the strongest documented insider edge
 *   3. Role-weighted buys   (20%) — CEO/CFO open-market purchase intensity
 *   4. Buyer/seller count   (20%) — breadth/balance
 *
 * Why this split (vs the previous 55/25/20):
 *   - Sells are noisier than buys (diversification, taxes, liquidity), so
 *     dollar flow shouldn't dominate the headline.
 *   - Clusters and CEO/CFO buys carry the published-research edge, so they
 *     deserve more weight.
 *
 * Calibrated to read 50 = neutral, ≥70 = "strong buying", <40 = "cautious".
 */
export function computeIndex(stats: {
  buyDollars: number;
  sellDollars: number;
  buyCount: number;
  sellCount: number;
  clusterCount: number;
  /** Sum of significance scores for CEO + CFO real buys — see roleWeightedBuyIntensity */
  roleWeightedBuyIntensity?: number;
}): number {
  const totalDollars = stats.buyDollars + stats.sellDollars;
  const dollarSignal =
    totalDollars > 0 ? (stats.buyDollars - stats.sellDollars) / totalDollars : 0;

  const totalCount = stats.buyCount + stats.sellCount;
  const countSignal =
    totalCount > 0 ? (stats.buyCount - stats.sellCount) / totalCount : 0;

  // Cluster signal: 0 → 0, 5 clusters → ~0.5, 10+ → 1
  const clusterSignal = Math.min(1, stats.clusterCount / 10);

  // Role-weighted buy intensity: 0 → 0, 200 → ~0.5, 400+ → 1
  // (200 ≈ two CEO buys at ~$1M each, or one $5M CEO buy)
  const roleSignal = Math.min(1, (stats.roleWeightedBuyIntensity ?? 0) / 400);

  // Weighted blend, then map -1..+1 → 0..100. Note: cluster + role are
  // strictly positive (no negative side), so they only push the score up.
  const blended =
    0.30 * dollarSignal +
    0.30 * clusterSignal +
    0.20 * roleSignal +
    0.20 * countSignal;
  const idx = Math.round(50 + blended * 50);
  return Math.max(0, Math.min(100, idx));
}

/**
 * Sum the significance scores of all CEO + CFO real buys in the window.
 * Used as the role-weighted-buy term in computeIndex().
 */
export function roleWeightedBuyIntensity(
  realBuys: Array<{ role: InsiderRole; dollars: number; stakePctChange: number; is10b5One: boolean }>
): number {
  return realBuys
    .filter((t) => t.role === "CEO" || t.role === "CFO")
    .reduce(
      (sum, t) =>
        sum +
        significanceScore({
          dollars: t.dollars,
          role: t.role,
          stakePctChange: t.stakePctChange,
          is10b5One: t.is10b5One,
          isCodeP: true,
        }),
      0
    );
}

/* ------------------------------------------------------------------ */
/* XML parser — minimal, regex-based, no external deps.               */
/* ------------------------------------------------------------------ */

const xmlText = (xml: string, tag: string): string | undefined => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
};

const xmlValue = (xml: string, tag: string): string | undefined => {
  const block = xmlText(xml, tag);
  if (!block) return undefined;
  return xmlText(block, "value") ?? block;
};

const xmlBool = (xml: string, tag: string): boolean => {
  const v = xmlValue(xml, tag);
  return v === "1" || v === "true";
};

const xmlNum = (xml: string, tag: string): number | undefined => {
  const v = xmlValue(xml, tag);
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Parse a Form 4 primary_doc.xml into one or more InsiderTransaction rows.
 * Multiple non-derivative transactions in the same filing yield multiple rows.
 */
export function parseForm4(
  xml: string,
  meta: { accession: string; filingDate: string; sectorLookup?: (cik: string) => string | undefined }
): InsiderTransaction[] {
  const issuer = xmlText(xml, "issuer") ?? "";
  const issuerCik = xmlText(issuer, "issuerCik") ?? "";
  const ticker = (xmlText(issuer, "issuerTradingSymbol") ?? "").toUpperCase();
  const company = xmlText(issuer, "issuerName") ?? "";

  const owner = xmlText(xml, "reportingOwner") ?? "";
  const insiderName = xmlText(owner, "rptOwnerName") ?? "";
  const rel = xmlText(owner, "reportingOwnerRelationship") ?? "";
  const isOfficer = xmlBool(rel, "isOfficer");
  const isDirector = xmlBool(rel, "isDirector");
  const isTenPercentOwner = xmlBool(rel, "isTenPercentOwner");
  const officerTitle = xmlText(rel, "officerTitle") ?? undefined;
  const role = classifyRole({ isOfficer, isDirector, isTenPercentOwner, officerTitle });

  const is10b5One = xmlBool(xml, "aff10b5One");

  const out: InsiderTransaction[] = [];

  // Match every <nonDerivativeTransaction>…</nonDerivativeTransaction> block
  const txRe = /<nonDerivativeTransaction[^>]*>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  let m: RegExpExecArray | null;
  while ((m = txRe.exec(xml)) !== null) {
    const block = m[1];
    const codeStr = xmlValue(block, "transactionCode") ?? "Other";
    const code = (["P", "S", "M", "F", "A", "G", "D", "X", "C"].includes(codeStr)
      ? codeStr
      : "Other") as TransactionCode;
    const ad = (xmlValue(block, "transactionAcquiredDisposedCode") ?? "A") as "A" | "D";
    const shares = xmlNum(block, "transactionShares") ?? 0;
    const price = xmlNum(block, "transactionPricePerShare") ?? 0;
    const sharesAfter = xmlNum(block, "sharesOwnedFollowingTransaction") ?? 0;
    const transactionDate = xmlValue(block, "transactionDate") ?? meta.filingDate;
    const ownership = (xmlValue(block, "directOrIndirectOwnership") ?? "D") as "D" | "I";

    const dollars = shares * price;
    const stakePctChange = sharesAfter > 0 ? (shares / sharesAfter) * 100 : 0;

    out.push({
      accession: meta.accession,
      ticker,
      company,
      issuerCik,
      sector: meta.sectorLookup?.(issuerCik) ?? "Unclassified",
      insiderName,
      role,
      officerTitle,
      transactionDate,
      filingDate: meta.filingDate,
      code,
      acquiredDisposed: ad,
      is10b5One,
      shares,
      pricePerShare: price,
      dollars,
      sharesOwnedAfter: sharesAfter,
      stakePctChange,
      ownership,
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Code-P filter — the editorial heart of the product.                */
/* ------------------------------------------------------------------ */

/**
 * "Real" insider buy = Code P, A=Acquired, dollars >= threshold,
 * not 10b5-1 plan. This is what we put on the leaderboard.
 */
export function isRealBuy(t: InsiderTransaction, minDollars = 25_000): boolean {
  return (
    t.code === "P" &&
    t.acquiredDisposed === "A" &&
    !t.is10b5One &&
    t.dollars >= minDollars
  );
}

/**
 * "Real" insider sell = Code S non-10b5-1, or Code P/D disposition,
 * dollars >= threshold.
 */
export function isRealSell(t: InsiderTransaction, minDollars = 25_000): boolean {
  if (t.dollars < minDollars) return false;
  if (t.is10b5One) return false;
  if (t.code === "S") return true;
  if (t.code === "D" && t.acquiredDisposed === "D") return true;
  return false;
}
