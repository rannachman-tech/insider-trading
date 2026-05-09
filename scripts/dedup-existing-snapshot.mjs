// Re-runs the group-filing dedup against the already-fetched
// data/insider-snapshot.json. No EDGAR calls — pure local recomputation.
// Use this when you're SEC-rate-limited but want to apply a methodology
// fix to an existing snapshot.
//
//   node scripts/dedup-existing-snapshot.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FILE = join(process.cwd(), "data", "insider-snapshot.json");
if (!existsSync(FILE)) {
  console.error("data/insider-snapshot.json not found. Run npm run ingest first.");
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(FILE, "utf8"));

// --- Same fingerprint as scripts/ingest-live.mjs ---
function fingerprint(t) {
  return [t.ticker, t.transactionDate, t.shares, t.pricePerShare, t.code, t.acquiredDisposed].join("|");
}

// Decode XML entities the same way ingest-live does. Patches snapshots
// generated before the entity-decode fix landed.
function unescapeXml(s) {
  if (s == null) return s;
  return String(s)
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&nbsp;/gi, " ");
}
function cleanRow(r) {
  if (r.insiderName) r.insiderName = unescapeXml(r.insiderName);
  if (r.officerTitle) r.officerTitle = unescapeXml(r.officerTitle);
  if (r.company) r.company = unescapeXml(r.company);
  if (Array.isArray(r.transactions)) {
    for (const t of r.transactions) {
      if (t.insiderName) t.insiderName = unescapeXml(t.insiderName);
      if (t.officerTitle) t.officerTitle = unescapeXml(t.officerTitle);
      if (t.company) t.company = unescapeXml(t.company);
    }
  }
  return r;
}

// --- Trust suffix tokens (matches edgar.ts / ingest-live.mjs) ---
const TRUST_SUFFIXES = new Set([
  "trust","trusts","tr","trustee","foundation","fdn",
  "llc","lp","llp","ltd","inc","corp","co","company",
  "family","estate","revocable","irrevocable",
  "holdings","holding","capital","ira",
  "iii","iv","ii","jr","sr",
]);
function normalizeIdentity(name) {
  if (!name) return "";
  const cleaned = String(name).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ").filter((t) => t && !TRUST_SUFFIXES.has(t));
  return tokens.sort().join(" ");
}

// 0. Unescape XML entities everywhere ("&amp;" → "&", etc.) before any
//    aggregation so deduped rows carry clean text.
for (const r of snapshot.leaderboard) cleanRow(r);
for (const c of snapshot.clusters) {
  if (c.company) c.company = unescapeXml(c.company);
  for (const i of c.insiders) {
    if (i.name) i.name = unescapeXml(i.name);
    if (i.officerTitle) i.officerTitle = unescapeXml(i.officerTitle);
  }
}
if (Array.isArray(snapshot.recentActivity)) {
  for (const a of snapshot.recentActivity) {
    if (a.insiderName) a.insiderName = unescapeXml(a.insiderName);
    if (a.company) a.company = unescapeXml(a.company);
  }
}

// 1. Dedupe transactions inside each leaderboard row by fingerprint.
//    Then re-sum the row's totals.
let rowsChanged = 0;
let txDuplicatesRemoved = 0;
for (const r of snapshot.leaderboard) {
  const seen = new Set();
  const dedup = [];
  for (const t of r.transactions) {
    const fp = fingerprint(t);
    if (seen.has(fp)) {
      txDuplicatesRemoved++;
      continue;
    }
    seen.add(fp);
    dedup.push(t);
  }
  if (dedup.length !== r.transactions.length) {
    rowsChanged++;
    r.transactions = dedup;
    r.shares = dedup.reduce((s, t) => s + t.shares, 0);
    r.dollars = dedup.reduce((s, t) => s + t.dollars, 0);
    r.avgPricePerShare = r.shares > 0 ? r.dollars / r.shares : 0;
    r.stakePctChange = dedup.reduce((s, t) => s + t.stakePctChange, 0);
  }
}

// 2. Merge leaderboard rows that are the same beneficial owner
//    (same ticker, same normalized insider identity).
const merged = new Map();
for (const r of snapshot.leaderboard) {
  const key = `${r.ticker}|${normalizeIdentity(r.insiderName)}`;
  const existing = merged.get(key);
  if (!existing) {
    merged.set(key, r);
    continue;
  }
  // Keep the longest-form name as canonical
  if ((r.insiderName?.length ?? 0) > (existing.insiderName?.length ?? 0)) {
    existing.insiderName = r.insiderName;
    existing.role = r.role;
    existing.officerTitle = r.officerTitle;
  }
  // Merge transactions, deduping again across the combined list
  const seen = new Set(existing.transactions.map(fingerprint));
  for (const t of r.transactions) {
    const fp = fingerprint(t);
    if (seen.has(fp)) {
      txDuplicatesRemoved++;
      continue;
    }
    seen.add(fp);
    existing.transactions.push(t);
  }
  existing.shares = existing.transactions.reduce((s, t) => s + t.shares, 0);
  existing.dollars = existing.transactions.reduce((s, t) => s + t.dollars, 0);
  existing.avgPricePerShare = existing.shares > 0 ? existing.dollars / existing.shares : 0;
  existing.stakePctChange = existing.transactions.reduce((s, t) => s + t.stakePctChange, 0);
  rowsChanged++;
}
const beforeCount = snapshot.leaderboard.length;
const after = [...merged.values()].sort(
  (a, b) => b.significance - a.significance || b.dollars - a.dollars
).map((r, i) => ({ ...r, rank: i + 1 }));
snapshot.leaderboard = after;
const removedRows = beforeCount - after.length;

// 3. Same for clusters, in case the live snapshot has duplicate-counted insiders.
let clustersChanged = 0;
for (const c of snapshot.clusters) {
  const byIdentity = new Map();
  for (const i of c.insiders) {
    const id = normalizeIdentity(i.name) || i.name;
    const existing = byIdentity.get(id);
    if (!existing) byIdentity.set(id, { ...i });
    else {
      existing.dollars += i.dollars;
      if ((i.name?.length ?? 0) > (existing.name?.length ?? 0)) {
        existing.name = i.name;
        existing.role = i.role;
        existing.officerTitle = i.officerTitle;
      }
    }
  }
  if (byIdentity.size !== c.insiders.length) {
    clustersChanged++;
    c.insiders = [...byIdentity.values()].sort((a, b) => b.dollars - a.dollars);
    c.insiderCount = c.insiders.length;
    c.totalDollars = c.insiders.reduce((s, i) => s + i.dollars, 0);
  }
}

// 4. Drop "Unclassified" from the sector heatmap (parser fallback,
//    not a real industry).
const sectorBefore = Array.isArray(snapshot.sectors) ? snapshot.sectors.length : 0;
if (Array.isArray(snapshot.sectors)) {
  snapshot.sectors = snapshot.sectors.filter(
    (s) => s.sector && s.sector !== "Unclassified"
  );
}
const sectorRemoved = sectorBefore - (snapshot.sectors?.length ?? 0);

// 5. Re-pick the "Sector tilt" indicator from sectors with ≥3 trades.
if (Array.isArray(snapshot.indicators)) {
  const tiltIdx = snapshot.indicators.findIndex(
    (i) => i.label === "Sector tilt" || i.label === "Hottest sector"
  );
  if (tiltIdx >= 0) {
    const confident = (snapshot.sectors ?? []).filter(
      (s) => s.buyCount + s.sellCount >= 3
    );
    const top = confident[0];
    snapshot.indicators[tiltIdx] = {
      ...snapshot.indicators[tiltIdx],
      value: top?.sector ?? "—",
      sub: top
        ? `Net ratio ${(top.netRatio * 100).toFixed(0)}%`
        : "Too few sector trades to draw a tilt",
    };
  }
}

writeFileSync(FILE, JSON.stringify(snapshot, null, 2));
console.log("Snapshot rewritten:");
console.log(`  Leaderboard rows: ${beforeCount} → ${after.length} (${removedRows} merged)`);
console.log(`  Transactions deduped:  ${txDuplicatesRemoved}`);
console.log(`  Cluster insider lists touched: ${clustersChanged}`);
console.log(`  Sectors filtered (Unclassified): ${sectorRemoved}`);
console.log(`  XML entities decoded across leaderboard, clusters, recentActivity`);
console.log(`  Sector tilt indicator re-picked from high-confidence sectors`);
