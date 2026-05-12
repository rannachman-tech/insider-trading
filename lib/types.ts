/**
 * Domain types for Insider Signal.
 *
 * The product's central editorial decision lives here: a "real" insider buy is
 * Code P (open-market purchase with personal cash). Everything else is noise
 * for our headline read.
 */

export type Phase = "heavy-buying" | "balanced" | "heavy-selling";

export type InsiderRole =
  | "CEO"
  | "CFO"
  | "President"
  | "COO"
  | "Chair"
  | "Director"
  | "Officer"
  | "10%Owner"
  | "Other";

export type TransactionCode =
  | "P"  // open-market PURCHASE — the only one that earns the headline
  | "S"  // open-market sale
  | "M"  // option/RSU exercise (noise)
  | "F"  // tax-withholding sale (noise)
  | "A"  // grant (noise)
  | "G"  // gift
  | "D"  // disposition / sale to issuer
  | "X"  // option exercise (in-the-money)
  | "C"  // conversion
  | "Other";

export interface InsiderTransaction {
  /** SEC accession (unique across the dataset) */
  accession: string;
  /** Issuer ticker, e.g. NVDA */
  ticker: string;
  /** Issuer display name */
  company: string;
  /** Issuer CIK */
  issuerCik: string;
  /** GICS-style sector classification (best-effort) */
  sector: string;
  /** Filer name (the insider) */
  insiderName: string;
  /** Best-effort short role */
  role: InsiderRole;
  /** Officer title verbatim (e.g. "Chief Financial Officer") */
  officerTitle?: string;
  /** ISO date the transaction was executed */
  transactionDate: string;
  /** ISO date the form was filed (T+2 max) */
  filingDate: string;
  /** Form 4 transaction code */
  code: TransactionCode;
  /** A=Acquired, D=Disposed (for code P this should be A) */
  acquiredDisposed: "A" | "D";
  /** Whether this filing was flagged as a 10b5-1 plan transaction */
  is10b5One: boolean;
  /** Number of shares in the transaction */
  shares: number;
  /** Price per share, USD */
  pricePerShare: number;
  /** Notional dollar amount (shares × pricePerShare) */
  dollars: number;
  /** Shares owned post-transaction */
  sharesOwnedAfter: number;
  /** % of stake this transaction represents (vs sharesOwnedAfter) */
  stakePctChange: number;
  /** Direct vs indirect ownership */
  ownership: "D" | "I";
}

/**
 * A weekly leaderboard row — aggregated per insider per ticker.
 * If the same insider has 3 buy fills the same day, they're collapsed here.
 */
export interface LeaderboardRow {
  rank: number;
  ticker: string;
  company: string;
  sector: string;
  insiderName: string;
  role: InsiderRole;
  officerTitle?: string;
  dollars: number;
  shares: number;
  avgPricePerShare: number;
  stakePctChange: number;
  /** Conviction score 0-100 = role weight × dollar size × % of stake */
  significance: number;
  /** Underlying transaction(s) */
  transactions: InsiderTransaction[];
}

/**
 * Cluster buy = multiple distinct insiders, same issuer, same rolling window.
 * Strongest documented signal in the academic literature.
 */
export interface ClusterBuy {
  ticker: string;
  company: string;
  sector: string;
  insiderCount: number;
  /** Distinct insider names, ranked by role significance */
  insiders: Array<{ name: string; role: InsiderRole; officerTitle?: string; dollars: number }>;
  totalDollars: number;
  /** Rolling window in days (typically 30) */
  windowDays: number;
  /** Date of the most recent buy in the cluster */
  latestDate: string;
  /** Composite cluster strength 0-100 */
  strength: number;
}

export interface SectorTile {
  sector: string;
  buyDollars: number;
  sellDollars: number;
  /** netDollars / (buyDollars + sellDollars), -1..+1 */
  netRatio: number;
  buyCount: number;
  sellCount: number;
}

export interface IndicatorTile {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
}

export interface HistoryPoint {
  date: string;
  index: number;
  netDollars: number;
}

/**
 * The full snapshot — produced by scripts/ingest-edgar.ts and committed
 * as data/insider-snapshot.json. The page reads this directly at build/run.
 */
export interface InsiderSnapshot {
  generatedAt: string;
  windowDays: number;
  /** Insider Conviction Index 0-100 */
  index: number;
  phase: Phase;
  verdict: string;
  netDollars: number;
  buyDollars: number;
  sellDollars: number;
  buyCount: number;
  sellCount: number;
  clusterCount: number;
  /** Top 20 by significance */
  leaderboard: LeaderboardRow[];
  clusters: ClusterBuy[];
  sectors: SectorTile[];
  history: HistoryPoint[];
  indicators: IndicatorTile[];
  /** Source health row inputs */
  sources: Array<{ name: string; ok: boolean; note?: string }>;
  /** Demo mode flag — true if this snapshot was generated from synthetic data */
  isDemo: boolean;
  /** Filter transparency — counts of what was excluded from the headline numbers */
  filtered: {
    /** Code-A grants, RSU vests etc */
    grantsAndAwards: number;
    /** Code-M / Code-X option exercises */
    optionExercises: number;
    /** Code-F tax-withholding sales */
    taxWithholding: number;
    /** 10b5-1 pre-scheduled trades */
    preScheduledSales: number;
    /** Buys/sells under the $25k floor */
    belowThreshold: number;
  };
  /** Recent activity strip — last N significant filings, newest first */
  recentActivity: Array<{
    ticker: string;
    company: string;
    insiderName: string;
    role: InsiderRole;
    isBuy: boolean;
    dollars: number;
    transactionDate: string;
  }>;
}
