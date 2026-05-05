/**
 * Verified eToro instrumentId mapping for stocks/ETFs that may appear in
 * snapshots or baskets. All IDs were resolved against the live eToro
 * public catalog at build time and re-validated by scripts/verify-baskets.mjs.
 *
 * If a snapshot contains a ticker not listed here, the leaderboard still
 * renders fine — it just can't include a "Trade on eToro" CTA for that row
 * until the ticker is added below and re-verified.
 */

export interface StockEntry {
  ticker: string;
  symbolFull: string;
  instrumentId: number;
  name: string;
}

export const STOCK_CATALOG: Record<string, StockEntry> = {
  // --- Large caps with verified IDs ---
  AAPL: { ticker: "AAPL", symbolFull: "AAPL", instrumentId: 1001, name: "Apple" },
  ABBV: { ticker: "ABBV", symbolFull: "ABBV", instrumentId: 1452, name: "AbbVie Inc" },
  AFRM: { ticker: "AFRM", symbolFull: "AFRM", instrumentId: 8108, name: "Affirm" },
  AMZN: { ticker: "AMZN", symbolFull: "AMZN", instrumentId: 1005, name: "Amazon.com Inc" },
  BAC:  { ticker: "BAC",  symbolFull: "BAC",  instrumentId: 1011, name: "Bank of America Corp" },
  COST: { ticker: "COST", symbolFull: "COST", instrumentId: 1461, name: "Costco Wholesale Corp" },
  CRWD: { ticker: "CRWD", symbolFull: "CRWD", instrumentId: 5506, name: "Crowdstrike Holdings" },
  DKNG: { ticker: "DKNG", symbolFull: "DKNG", instrumentId: 7990, name: "Draftkings Inc" },
  ENPH: { ticker: "ENPH", symbolFull: "ENPH", instrumentId: 5634, name: "Enphase Energy Inc." },
  F:    { ticker: "F",    symbolFull: "F",    instrumentId: 1112, name: "Ford Motor Co" },
  KMI:  { ticker: "KMI",  symbolFull: "KMI",  instrumentId: 1601, name: "Kinder Morgan Inc" },
  LULU: { ticker: "LULU", symbolFull: "LULU", instrumentId: 4309, name: "Lululemon Athletica Inc" },
  META: { ticker: "META", symbolFull: "META", instrumentId: 1003, name: "Meta Platforms Inc" },
  NVDA: { ticker: "NVDA", symbolFull: "NVDA", instrumentId: 1137, name: "NVIDIA Corporation" },
  ORCL: { ticker: "ORCL", symbolFull: "ORCL", instrumentId: 1135, name: "Oracle Corporation" },
  PYPL: { ticker: "PYPL", symbolFull: "PYPL", instrumentId: 1484, name: "PayPal Holdings" },
  SOFI: { ticker: "SOFI", symbolFull: "SOFI", instrumentId: 9255, name: "SoFi Technologies Inc" },
  TSLA: { ticker: "TSLA", symbolFull: "TSLA", instrumentId: 1111, name: "Tesla Motors, Inc." },
  UAL:  { ticker: "UAL",  symbolFull: "UAL",  instrumentId: 1524, name: "United Airlines Holdings Inc" },
  WMT:  { ticker: "WMT",  symbolFull: "WMT",  instrumentId: 1035, name: "Walmart Inc." },

  // --- ETFs for the balanced + defensive baskets ---
  VTI:  { ticker: "VTI",  symbolFull: "VTI",  instrumentId: 4237, name: "Vanguard Total Stock Market ETF" },
  DGRO: { ticker: "DGRO", symbolFull: "DGRO", instrumentId: 3149, name: "iShares Core Dividend Growth ETF" },
  SHV:  { ticker: "SHV",  symbolFull: "SHV",  instrumentId: 4321, name: "iShares 0-1 Year Treasury Bond" },
  IAU:  { ticker: "IAU",  symbolFull: "IAU",  instrumentId: 4365, name: "iShares Gold Trust" },
  USMV: { ticker: "USMV", symbolFull: "USMV", instrumentId: 4292, name: "iShares Edge MSCI Min Vol USA" },
  TLT:  { ticker: "TLT",  symbolFull: "TLT",  instrumentId: 3020, name: "iShares 20+ Year Treasury Bond ETF" },
};

/** Look up a ticker's verified eToro entry. Returns null if not in the catalog. */
export function lookupStock(ticker: string): StockEntry | null {
  return STOCK_CATALOG[ticker.toUpperCase()] ?? null;
}

/** Every entry, useful for the verifier. */
export function allStockEntries(): StockEntry[] {
  return Object.values(STOCK_CATALOG);
}
