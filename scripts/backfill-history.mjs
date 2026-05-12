// Real EDGAR history backfill.
//
//   node scripts/backfill-history.mjs
//
// Walks the last 67 weekdays of EDGAR daily-index files, fetches every Form 4
// once, parses transactions, then computes the rolling 7-day Insider Conviction
// Index for each of the last 60 historical days. The output is REAL data —
// no synthetic baseline, no fillers — written into data/insider-snapshot.json
// under `history`.
//
// Long-running. Expect 2-4 hours at SEC's 6-8 req/sec sustained. Resumable:
// fetched filings are cached in data/.backfill-cache/ so a re-run skips work
// already done. Designed to survive a 429 by sleeping and retrying.
//
// One-time job; the daily ingest script (`ingest-live.mjs`) appends today's
// point on each run from then on.

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SNAPSHOT_FILE = join(ROOT, "data", "insider-snapshot.json");
const CACHE_DIR = join(ROOT, "data", ".backfill-cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const CONTACT = process.env.EDGAR_CONTACT || "ranna@etoro.com";
const USER_AGENT = `Insiders Activity Compass ${CONTACT}`;
const HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/xml,text/html,*/*;q=0.8",
};

const HISTORY_DAYS = parseInt(process.env.BACKFILL_DAYS ?? "60", 10);
const WINDOW_DAYS = 7;
// SEC fair-use is 10 req/sec sustained. Stay well under it.
// 2 concurrent + 500ms gap → ~4 req/sec peak, ~3 req/sec sustained.
const CONCURRENCY = parseInt(process.env.BACKFILL_CONCURRENCY ?? "2", 10);
const PACE_MS = parseInt(process.env.BACKFILL_PACE_MS ?? "500", 10);

// GLOBAL 429 cooldown — when any fetch sees 429, ALL fetches pause until
// this timestamp passes. Prevents the retry-while-others-still-hammering
// pattern that turns "one 429" into "everything 429s in escalating waves."
let cooldownUntil = 0;
let consecutive429s = 0;
async function respectCooldown() {
  while (Date.now() < cooldownUntil) {
    const wait = cooldownUntil - Date.now();
    await sleep(Math.min(wait, 5000));
  }
}

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- date helpers ----------
function lastWeekdays(n) {
  const out = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1); // start at yesterday — today's index isn't published yet
  while (out.length < n) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}
function quarterOf(d) { return Math.floor(d.getUTCMonth() / 3) + 1; }
function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ""); }
function iso(d) { return d.toISOString().slice(0, 10); }
function dailyIndexUrl(d) {
  return `https://www.sec.gov/Archives/edgar/daily-index/${d.getUTCFullYear()}/QTR${quarterOf(d)}/form.${ymd(d)}.idx`;
}
function txtToFolder(filename) {
  const m = filename.match(/edgar\/data\/(\d+)\/([\d-]+)\.txt$/);
  if (!m) return null;
  const cik = m[1];
  const accession = m[2];
  const folder = accession.replace(/-/g, "");
  return {
    accession, cik,
    primaryDocUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${folder}/primary_doc.xml`,
  };
}

// ---------- XML helpers ----------
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
function unescapeXml(s) {
  if (s == null) return s;
  return String(s)
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'").replace(/&#34;/g, '"').replace(/&nbsp;/gi, " ");
}
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

function parseForm4(xml, meta) {
  const issuer = xmlText(xml, "issuer") ?? "";
  const ticker = (xmlText(issuer, "issuerTradingSymbol") ?? "").toUpperCase();
  const owner = xmlText(xml, "reportingOwner") ?? "";
  const insiderName = unescapeXml(xmlText(owner, "rptOwnerName")) ?? "";
  const rel = xmlText(owner, "reportingOwnerRelationship") ?? "";
  const isOfficer = xmlBool(rel, "isOfficer");
  const isDirector = xmlBool(rel, "isDirector");
  const isTenPercentOwner = xmlBool(rel, "isTenPercentOwner");
  const officerTitle = unescapeXml(xmlText(rel, "officerTitle")) ?? undefined;
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
    const transactionDate = xmlValue(block, "transactionDate") ?? meta.filingDate;
    const dollars = shares * price;
    // Sanity filter — no real Form 4 has had a single transaction with
    // shares >1B or dollars >$1B. Anything beyond is a parser miss or an
    // edge-case filing (e.g. stock split notification) we don't want
    // bleeding into the historical net-flow display.
    if (shares > 1_000_000_000) continue;
    if (dollars > 1_000_000_000) continue;
    if (!Number.isFinite(dollars) || dollars < 0) continue;
    const stakePctChange = sharesAfter > 0 ? (shares / sharesAfter) * 100 : 0;
    out.push({
      accession: meta.accession, ticker, insiderName, role,
      transactionDate, code, acquiredDisposed: ad, is10b5One,
      shares, pricePerShare: price, dollars, stakePctChange,
    });
  }
  return out;
}

// ---------- daily index parsing ----------
async function fetchDailyIndex(d) {
  const url = dailyIndexUrl(d);
  const cacheFile = join(CACHE_DIR, `idx-${ymd(d)}.txt`);
  let txt;
  if (existsSync(cacheFile)) {
    txt = readFileSync(cacheFile, "utf8");
  } else {
    const res = await fetchWithRetry(url);
    if (!res) return [];
    txt = await res.text();
    writeFileSync(cacheFile, txt);
  }
  const lines = txt.split("\n");
  const entries = [];
  for (const line of lines) {
    if (!/^4\s/.test(line)) continue;
    const fnameMatch = line.match(/(edgar\/data\/\d+\/[\d-]+\.txt)\s*$/);
    if (!fnameMatch) continue;
    const folder = txtToFolder(fnameMatch[1]);
    if (!folder) continue;
    const cikMatch = line.match(/(\d{1,10})\s+(\d{8})\s+edgar\/data/);
    const filingDate = cikMatch ? `${cikMatch[2].slice(0,4)}-${cikMatch[2].slice(4,6)}-${cikMatch[2].slice(6,8)}` : iso(d);
    entries.push({ ...folder, filingDate });
  }
  return entries;
}

// ---------- HTTP with global-cooldown backoff + cache ----------
async function fetchWithRetry(url, attempt = 1) {
  // Wait if a global cooldown is active (set by ANY fetch that sees 429)
  await respectCooldown();
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 429) {
      consecutive429s++;
      // Escalating GLOBAL cooldown: every concurrent fetch will park here
      // until the cooldown lifts. Prevents the "retry while everything else
      // hammers" pattern that just keeps SEC's throttle hot.
      // 1st 429: 2 min. 2nd: 5 min. 3rd: 15 min. 4th: 30 min. Then bail.
      const escalation = [120, 300, 900, 1800];
      const seconds = escalation[Math.min(consecutive429s - 1, escalation.length - 1)];
      cooldownUntil = Date.now() + seconds * 1000;
      console.warn(`\n  429 — global cooldown ${seconds}s (consecutive 429s: ${consecutive429s}). All fetches paused.`);
      if (consecutive429s >= 5) {
        console.error("  Too many 429s in a row. Bail out — let SEC's window cool fully, then re-run (cache resumes from where you stopped).");
        process.exit(2);
      }
      await respectCooldown();
      if (attempt < 3) return fetchWithRetry(url, attempt + 1);
      return null;
    }
    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`  HTTP ${res.status} ${url}`);
      return null;
    }
    consecutive429s = 0; // reset on any success
    return res;
  } catch (err) {
    if (attempt < 3) {
      await sleep(2_000 * attempt);
      return fetchWithRetry(url, attempt + 1);
    }
    return null;
  }
}

const XML_NAMES = ["primary_doc.xml", "ownership.xml", "form4.xml"];
async function fetchPrimaryDoc(entry) {
  const cacheFile = join(CACHE_DIR, `f4-${entry.accession.replace(/-/g, "")}.xml`);
  if (existsSync(cacheFile)) {
    const cached = readFileSync(cacheFile, "utf8");
    if (cached.length > 50) return cached;
  }
  for (const name of XML_NAMES) {
    const url = entry.primaryDocUrl.replace(/[^/]+\.xml$/, name);
    const res = await fetchWithRetry(url);
    if (!res) continue;
    const xml = await res.text();
    if (xml.includes("<issuer>") || xml.includes("<ownershipDocument")) {
      writeFileSync(cacheFile, xml);
      return xml;
    }
  }
  // Fallback: scrape directory listing
  try {
    const folderUrl = entry.primaryDocUrl.replace(/[^/]+\.xml$/, "");
    const dirRes = await fetchWithRetry(folderUrl);
    if (!dirRes) return null;
    const dirHtml = await dirRes.text();
    const xmlMatch = dirHtml.match(/href="([^"]+\.xml)"/i);
    if (!xmlMatch) return null;
    const xmlUrl = xmlMatch[1].startsWith("http") ? xmlMatch[1] : `https://www.sec.gov${xmlMatch[1]}`;
    const xmlRes = await fetchWithRetry(xmlUrl);
    if (!xmlRes) return null;
    const xml = await xmlRes.text();
    if (xml.includes("<issuer>") || xml.includes("<ownershipDocument")) {
      writeFileSync(cacheFile, xml);
      return xml;
    }
  } catch {}
  // Cache a "miss" marker so we don't refetch every run
  writeFileSync(cacheFile, "");
  return null;
}

// ---------- index computation (mirror of ingest-live.mjs) ----------
const PER_TX_DOLLAR_CAP = 5_000_000;
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

/** Compute the index for a given anchor date, looking back 7 days. */
function indexForDay(allTxs, anchorIso, clusterMin = 3) {
  const anchor = new Date(anchorIso).getTime();
  const within = (iso, days) => anchor - new Date(iso).getTime() <= days * 86_400_000 && new Date(iso).getTime() <= anchor;
  const realBuys = dedupeGroupFilings(allTxs.filter((t) => isRealBuy(t) && within(t.transactionDate, WINDOW_DAYS)));
  const realSells = dedupeGroupFilings(allTxs.filter((t) => isRealSell(t) && within(t.transactionDate, WINDOW_DAYS)));
  const clusterWindow = dedupeGroupFilings(allTxs.filter((t) => isRealBuy(t) && within(t.transactionDate, 30)));

  // Cluster count
  const byTicker = new Map();
  for (const t of clusterWindow) {
    const arr = byTicker.get(t.ticker) ?? [];
    arr.push(t); byTicker.set(t.ticker, arr);
  }
  let clusterCount = 0;
  for (const [, txs] of byTicker) {
    const distinct = new Set(txs.map((t) => normalizeIdentity(t.insiderName) || t.insiderName));
    if (distinct.size >= clusterMin) clusterCount++;
  }

  // Capped sums
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
  // Display-scale netDollars — capped per-tx so one outlier filing can't
  // dominate the spark visualization. Matches the cap used in the index
  // computation.
  const buyDollars = realBuys.reduce((s, t) => s + capDollars(t.dollars), 0);
  const sellDollars = realSells.reduce((s, t) => s + capDollars(t.dollars), 0);
  return { index, netDollars: buyDollars - sellDollars };
}

// ---------- main ----------
async function processBatch(entries, onProgress) {
  const out = [];
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (e) => {
      try {
        const xml = await fetchPrimaryDoc(e);
        if (!xml) return null;
        return parseForm4(xml, { accession: e.accession, filingDate: e.filingDate });
      } catch { return null; }
    }));
    for (const txs of results) if (txs) out.push(...txs);
    if (i % 200 === 0 && i > 0) onProgress?.(i, entries.length, out.length);
    await sleep(PACE_MS);
  }
  return out;
}

async function main() {
  console.log(`EDGAR history backfill — User-Agent: ${USER_AGENT}`);
  console.log(`Walking last ${HISTORY_DAYS + WINDOW_DAYS} weekdays of Form 4 filings (${HISTORY_DAYS} historical + ${WINDOW_DAYS}-day window)...`);

  // 1. Pull daily-index files for the full lookback
  const days = lastWeekdays(HISTORY_DAYS + WINDOW_DAYS);
  let allEntries = [];
  for (const d of days) {
    const ents = await fetchDailyIndex(d);
    console.log(`  ${ymd(d)}: ${ents.length} Form 4 entries`);
    allEntries.push(...ents);
  }

  // 2. Dedupe by accession
  const seen = new Set();
  const dedup = [];
  for (const e of allEntries) {
    if (seen.has(e.accession)) continue;
    seen.add(e.accession);
    dedup.push(e);
  }
  console.log(`\n${dedup.length} unique Form 4 filings to process (after accession dedup)`);

  // 3. Fetch + parse each filing (cached)
  console.log(`Fetching primary_doc.xml at ~${CONCURRENCY * (1000 / PACE_MS)} req/sec sustained...`);
  const transactions = await processBatch(dedup, (done, total, txCount) => {
    const pct = Math.round((done / total) * 100);
    console.log(`  …${pct}% (${done}/${total}) — ${txCount} transactions parsed so far`);
  });
  console.log(`\nParsed ${transactions.length} transactions from ${dedup.length} filings`);

  // 4. Compute index for each historical day in the last HISTORY_DAYS calendar days
  const today = new Date();
  today.setUTCDate(today.getUTCDate() - 1);
  const historyDays = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    historyDays.push(iso(d));
  }
  console.log(`Computing index for ${historyDays.length} historical days...`);
  const history = historyDays.map((dateIso) => {
    const { index, netDollars } = indexForDay(transactions, dateIso);
    return { date: dateIso, index, netDollars };
  });

  // 5. Merge into existing snapshot's history
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8"));
  const existing = (snapshot.history ?? []).filter((p) => !p.synthetic);
  // Replace any overlapping dates with the freshly-computed values
  const merged = new Map();
  for (const p of existing) merged.set(p.date, p);
  for (const p of history) merged.set(p.date, p);
  snapshot.history = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-365);

  writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
  console.log(`\nWrote ${SNAPSHOT_FILE}`);
  console.log(`  History points (real): ${snapshot.history.length}`);
  console.log(`  Date range: ${snapshot.history[0]?.date} → ${snapshot.history.at(-1)?.date}`);

  // Quick spot check
  const sample = snapshot.history.slice(-5);
  console.log(`\nLast 5 days:`);
  for (const p of sample) {
    const fmt = (n) => (n >= 0 ? "+$" : "−$") + (Math.abs(n) >= 1e9 ? (Math.abs(n) / 1e9).toFixed(2) + "B" : (Math.abs(n) / 1e6).toFixed(0) + "M");
    console.log(`  ${p.date}  index ${p.index}  netDollars ${fmt(p.netDollars)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
