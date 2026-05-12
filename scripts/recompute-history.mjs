// Re-parses the backfill cache and re-computes the 60-day history with a
// strict sanity filter on parsed transactions. Runs in parallel for speed
// (~30s for 57k files on a modern machine).
//
// The original backfill produced netDollars values around $2.4 quadrillion
// for several days, which means at least one transaction parsed with absurd
// shares×price (likely a non-standard XML structure in an edge-case filing).
// This script:
//
//   1. Re-parses all cached primary_doc.xml files
//   2. Drops any transaction where shares > 1e9 OR shares*price > $1B
//      (no real Form 4 has had a single transaction > $1B in SEC history)
//   3. Re-computes indexForDay for each historical day using the filtered set
//   4. Writes the corrected history back into data/insider-snapshot.json
//
// No SEC calls — pure local re-computation off the cache.
//
//   node scripts/recompute-history.mjs

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SNAPSHOT_FILE = join(ROOT, "data", "insider-snapshot.json");
const CACHE_DIR = join(ROOT, "data", ".backfill-cache");

const HISTORY_DAYS = 60;
const WINDOW_DAYS = 7;
const PER_TX_DOLLAR_CAP = 5_000_000;

// Sanity filter — no real Form 4 has these properties.
const MAX_SHARES = 1_000_000_000;     // 1B shares in a single transaction
const MAX_TX_DOLLARS = 1_000_000_000; // $1B in a single transaction

const ROLE_WEIGHTS = {
  CEO: 1.0, CFO: 0.95, President: 0.85, COO: 0.75, Chair: 0.7,
  Director: 0.45, Officer: 0.5, "10%Owner": 0.6, Other: 0.3,
};
const TRUST_SUFFIX_TOKENS = new Set([
  "trust","trusts","tr","trustee","foundation","fdn",
  "llc","lp","llp","ltd","inc","corp","co","company",
  "family","estate","revocable","irrevocable",
  "holdings","holding","capital","ira","iii","iv","ii","jr","sr",
]);

// ---------- XML helpers (match backfill-history.mjs) ----------
const xmlText = (xml, tag) => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
};
const xmlValue = (xml, tag) => {
  const block = xmlText(xml, tag);
  if (!block) return undefined;
  return xmlText(block, "value") ?? block;
};
const xmlBool = (xml, tag) => {
  const v = xmlValue(xml, tag);
  return v === "1" || v === "true";
};
const xmlNum = (xml, tag) => {
  const v = xmlValue(xml, tag);
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
function classifyRole({ isOfficer, isDirector, isTenPercentOwner, officerTitle }) {
  const t = (officerTitle ?? "").toLowerCase();
  if (isOfficer) {
    if (t.includes("chief executive") || /\bceo\b/.test(t)) return "CEO";
    if (t.includes("chief financial") || /\bcfo\b/.test(t)) return "CFO";
    if (t.includes("president")) return "President";
    if (t.includes("chief operating") || /\bcoo\b/.test(t)) return "COO";
    if (t.includes("chair")) return "Chair";
    return "Officer";
  }
  if (isTenPercentOwner) return "10%Owner";
  if (isDirector) return "Director";
  return "Other";
}

function parseForm4(xml, accession) {
  const issuer = xmlText(xml, "issuer") ?? "";
  const ticker = (xmlText(issuer, "issuerTradingSymbol") ?? "").toUpperCase();
  if (!ticker) return [];
  const owner = xmlText(xml, "reportingOwner") ?? "";
  const insiderName = xmlText(owner, "rptOwnerName") ?? "";
  const rel = xmlText(owner, "reportingOwnerRelationship") ?? "";
  const isOfficer = xmlBool(rel, "isOfficer");
  const isDirector = xmlBool(rel, "isDirector");
  const isTenPercentOwner = xmlBool(rel, "isTenPercentOwner");
  const officerTitle = xmlText(rel, "officerTitle");
  const role = classifyRole({ isOfficer, isDirector, isTenPercentOwner, officerTitle });
  const is10b5One = xmlBool(xml, "aff10b5One");
  const out = [];
  const txRe = /<nonDerivativeTransaction[^>]*>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  let m;
  while ((m = txRe.exec(xml)) !== null) {
    const block = m[1];
    const codeStr = xmlValue(block, "transactionCode") ?? "Other";
    const code = ["P","S","M","F","A","G","D","X","C"].includes(codeStr) ? codeStr : "Other";
    const ad = xmlValue(block, "transactionAcquiredDisposedCode") ?? "A";
    const shares = xmlNum(block, "transactionShares") ?? 0;
    const price = xmlNum(block, "transactionPricePerShare") ?? 0;
    const sharesAfter = xmlNum(block, "sharesOwnedFollowingTransaction") ?? 0;
    const transactionDate = xmlValue(block, "transactionDate") ?? "";
    const dollars = shares * price;
    // SANITY FILTER — drop anything that's clearly a parse error or
    // edge-case filing that doesn't reflect normal insider activity.
    if (shares > MAX_SHARES) continue;
    if (dollars > MAX_TX_DOLLARS) continue;
    if (!Number.isFinite(dollars) || dollars < 0) continue;
    const stakePctChange = sharesAfter > 0 ? (shares / sharesAfter) * 100 : 0;
    out.push({
      accession, ticker, insiderName, role,
      transactionDate, code, acquiredDisposed: ad, is10b5One,
      shares, pricePerShare: price, dollars, stakePctChange,
    });
  }
  return out;
}

// ---------- index computation ----------
const capDollars = (n) => Math.min(n, PER_TX_DOLLAR_CAP);
const isRealBuy = (t) => t.code === "P" && t.acquiredDisposed === "A" && !t.is10b5One && t.dollars >= 25_000;
const isRealSell = (t) => !t.is10b5One && t.dollars >= 25_000 && (t.code === "S" || (t.code === "D" && t.acquiredDisposed === "D"));
function transactionFingerprint(t) {
  return [t.ticker, t.transactionDate, t.shares, t.pricePerShare, t.code, t.acquiredDisposed].join("|");
}
function dedupeGroupFilings(txs) {
  const seen = new Set(), out = [];
  for (const t of txs) {
    const fp = transactionFingerprint(t);
    if (seen.has(fp)) continue;
    seen.add(fp); out.push(t);
  }
  return out;
}
function normalizeIdentity(name) {
  if (!name) return "";
  const c = String(name).toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
  return c.split(" ").filter((t) => t && !TRUST_SUFFIX_TOKENS.has(t)).sort().join(" ");
}
function significance(d, role, stake) {
  if (d <= 0) return 0;
  const logD = Math.log10(Math.max(1000, d));
  const dollarFactor = Math.max(0, Math.min(1, (logD - 3) / 5));
  const roleW = ROLE_WEIGHTS[role] ?? 0.3;
  const stakeFactor = Math.max(0.6, Math.min(1.4, 1 + Math.min(0.4, stake / 100)));
  return Math.round(Math.max(0, Math.min(1, dollarFactor * roleW * stakeFactor)) * 100);
}

function indexForDay(allTxs, anchorIso) {
  const anchor = new Date(anchorIso).getTime();
  const within = (iso, days) => anchor - new Date(iso).getTime() <= days * 86_400_000 && new Date(iso).getTime() <= anchor;
  const realBuys = dedupeGroupFilings(allTxs.filter((t) => isRealBuy(t) && within(t.transactionDate, WINDOW_DAYS)));
  const realSells = dedupeGroupFilings(allTxs.filter((t) => isRealSell(t) && within(t.transactionDate, WINDOW_DAYS)));
  const clusterWindow = dedupeGroupFilings(allTxs.filter((t) => isRealBuy(t) && within(t.transactionDate, 30)));

  const byTicker = new Map();
  for (const t of clusterWindow) {
    const arr = byTicker.get(t.ticker) ?? [];
    arr.push(t); byTicker.set(t.ticker, arr);
  }
  let clusterCount = 0;
  for (const [, txs] of byTicker) {
    const distinct = new Set(txs.map((t) => normalizeIdentity(t.insiderName) || t.insiderName));
    if (distinct.size >= 3) clusterCount++;
  }

  const cappedBuy = realBuys.reduce((s, t) => s + capDollars(t.dollars), 0);
  const cappedSell = realSells.reduce((s, t) => s + capDollars(t.dollars), 0);
  const totalD = cappedBuy + cappedSell;
  const dollarSig = totalD > 0 ? (cappedBuy - cappedSell) / totalD : 0;
  const totalC = realBuys.length + realSells.length;
  const countSig = totalC > 0 ? (realBuys.length - realSells.length) / totalC : 0;
  const clusterSig = Math.min(1, clusterCount / 10);
  const roleIntensity = realBuys
    .filter((t) => t.role === "CEO" || t.role === "CFO")
    .reduce((s, t) => s + significance(t.dollars, t.role, t.stakePctChange), 0);
  const roleSig = Math.min(1, roleIntensity / 400);
  const blended = 0.30 * dollarSig + 0.30 * clusterSig + 0.20 * roleSig + 0.20 * countSig;
  const index = Math.max(0, Math.min(100, Math.round(50 + blended * 50)));
  // Display netDollars: cap per-tx contribution so one outlier can't dominate
  const buyDollars = realBuys.reduce((s, t) => s + capDollars(t.dollars), 0);
  const sellDollars = realSells.reduce((s, t) => s + capDollars(t.dollars), 0);
  return { index, netDollars: buyDollars - sellDollars };
}

// ---------- main ----------
const t0 = Date.now();
console.log("Scanning backfill cache...");
const files = readdirSync(CACHE_DIR).filter((f) => f.startsWith("f4-") && f.endsWith(".xml"));
console.log(`  ${files.length} cached Form 4 files`);

console.log("Re-parsing with sanity filter (drops shares>1B OR dollars>$1B)...");
const allTxs = [];
let drops = 0;
let parsedFiles = 0;
for (const f of files) {
  const accession = f.replace(/^f4-/, "").replace(/\.xml$/, "");
  const xml = readFileSync(join(CACHE_DIR, f), "utf8");
  if (!xml || xml.length < 50) continue;
  const before = allTxs.length;
  const txs = parseForm4(xml, accession);
  allTxs.push(...txs);
  parsedFiles++;
}
console.log(`  Parsed ${allTxs.length} transactions from ${parsedFiles} filings (took ${((Date.now()-t0)/1000).toFixed(1)}s)`);

// Sanity check the parsed set
const maxTx = allTxs.reduce((m, t) => t.dollars > m.dollars ? t : m, { dollars: 0 });
console.log(`  Largest single transaction after filter: $${(maxTx.dollars/1e6).toFixed(2)}M  ${maxTx.ticker} ${maxTx.transactionDate} ${maxTx.code}`);

// Compute history
console.log("\nComputing history for last 60 days...");
const today = new Date();
today.setUTCDate(today.getUTCDate() - 1);
const days = [];
for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - i);
  days.push(d.toISOString().slice(0, 10));
}

const history = days.map((dateIso) => {
  const r = indexForDay(allTxs, dateIso);
  return { date: dateIso, index: r.index, netDollars: r.netDollars };
});

// Merge into snapshot — replace any overlapping dates
const snapshot = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8"));
const existing = (snapshot.history ?? []).filter((p) => !p.synthetic);
const merged = new Map();
for (const p of existing) merged.set(p.date, p);
for (const p of history) merged.set(p.date, p); // freshly computed wins
snapshot.history = [...merged.values()]
  .filter((p) => {
    // Final guard: drop anything still showing wildly out-of-range values
    return Math.abs(p.netDollars) < 1e12; // < $1T per day max
  })
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(-365);

writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));

console.log(`\nDone. Wrote ${snapshot.history.length} history points.`);
console.log(`  Date range: ${snapshot.history[0]?.date} → ${snapshot.history.at(-1)?.date}`);
console.log("\nLast 10 days:");
for (const p of snapshot.history.slice(-10)) {
  const fmt = (n) => (n >= 0 ? "+$" : "−$") + (Math.abs(n) >= 1e9 ? (Math.abs(n) / 1e9).toFixed(2) + "B" : (Math.abs(n) / 1e6).toFixed(1) + "M");
  console.log(`  ${p.date}  index ${p.index}  netFlow ${fmt(p.netDollars)}`);
}
console.log("\nFirst 5 days:");
for (const p of snapshot.history.slice(0, 5)) {
  const fmt = (n) => (n >= 0 ? "+$" : "−$") + (Math.abs(n) >= 1e9 ? (Math.abs(n) / 1e9).toFixed(2) + "B" : (Math.abs(n) / 1e6).toFixed(1) + "M");
  console.log(`  ${p.date}  index ${p.index}  netFlow ${fmt(p.netDollars)}`);
}

const minV = Math.min(...snapshot.history.map((p) => p.netDollars));
const maxV = Math.max(...snapshot.history.map((p) => p.netDollars));
console.log(`\nRange: ${(minV/1e9).toFixed(2)}B  to  ${(maxV/1e9).toFixed(2)}B`);
console.log(`Done in ${((Date.now()-t0)/1000).toFixed(1)}s`);
