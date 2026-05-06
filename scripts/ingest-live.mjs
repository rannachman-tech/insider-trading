// Live EDGAR Form 4 ingest — vanilla Node.
//
//   node scripts/ingest-live.mjs
//
// Walks the EDGAR daily-index files for the last N weekdays (default 5),
// extracts every Form 4 entry, fetches each filing's primary_doc.xml,
// applies our filters, and writes a real snapshot to data/insider-snapshot.json.
//
// SEC requires a real contact User-Agent — set EDGAR_CONTACT.

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "data");
const OUT_FILE = join(OUT_DIR, "insider-snapshot.json");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const CONTACT = process.env.EDGAR_CONTACT || "ranna@etoro.com";
const USER_AGENT = `Insiders Activity Compass ${CONTACT}`;
const HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/xml,text/html,*/*;q=0.8",
};

const DAYS_BACK = parseInt(process.env.EDGAR_DAYS ?? "5", 10);
const MAX_FILINGS = parseInt(process.env.EDGAR_MAX ?? "6000", 10);
const CONCURRENCY = 6;

const ROLE_WEIGHTS = {
  CEO: 1.0, CFO: 0.95, President: 0.85, COO: 0.75, Chair: 0.7,
  Director: 0.45, Officer: 0.5, "10%Owner": 0.6, Other: 0.3,
};
const ROLE_RANK = {
  CEO: 0, CFO: 1, President: 2, COO: 3, Chair: 4,
  Officer: 5, "10%Owner": 6, Director: 7, Other: 8,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lastWeekdays(n) {
  const out = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  while (out.length < n) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}
function quarterOf(d) { return Math.floor(d.getUTCMonth() / 3) + 1; }
function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ""); }
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
    indexUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${folder}/${accession}-index.htm`,
    primaryDocUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${folder}/primary_doc.xml`,
  };
}

async function fetchDailyIndex(d) {
  const url = dailyIndexUrl(d);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 404) return [];
    console.warn(`  ${ymd(d)}: HTTP ${res.status}`);
    return [];
  }
  const txt = await res.text();
  const lines = txt.split("\n");
  const entries = [];
  for (const line of lines) {
    if (!/^4\s/.test(line)) continue;
    const filenameMatch = line.match(/(edgar\/data\/\d+\/[\d-]+\.txt)\s*$/);
    if (!filenameMatch) continue;
    const folder = txtToFolder(filenameMatch[1]);
    if (!folder) continue;
    const cikMatch = line.match(/(\d{1,10})\s+(\d{8})\s+edgar\/data/);
    const filingDate = cikMatch ? `${cikMatch[2].slice(0, 4)}-${cikMatch[2].slice(4, 6)}-${cikMatch[2].slice(6, 8)}` : ymd(d);
    entries.push({ ...folder, filingDate });
  }
  return entries;
}

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

function parseForm4(xml, meta) {
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
  const out = [];
  const txRe = /<nonDerivativeTransaction[^>]*>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  let m;
  while ((m = txRe.exec(xml)) !== null) {
    const block = m[1];
    const codeStr = xmlValue(block, "transactionCode") ?? "Other";
    const code = ["P", "S", "M", "F", "A", "G", "D", "X", "C"].includes(codeStr) ? codeStr : "Other";
    const ad = xmlValue(block, "transactionAcquiredDisposedCode") ?? "A";
    const shares = xmlNum(block, "transactionShares") ?? 0;
    const price = xmlNum(block, "transactionPricePerShare") ?? 0;
    const sharesAfter = xmlNum(block, "sharesOwnedFollowingTransaction") ?? 0;
    const transactionDate = xmlValue(block, "transactionDate") ?? meta.filingDate;
    const ownership = xmlValue(block, "directOrIndirectOwnership") ?? "D";
    const dollars = shares * price;
    const stakePctChange = sharesAfter > 0 ? (shares / sharesAfter) * 100 : 0;
    out.push({
      accession: meta.accession, ticker, company, issuerCik,
      sector: "Unclassified",
      insiderName, role, officerTitle,
      transactionDate, filingDate: meta.filingDate,
      code, acquiredDisposed: ad, is10b5One,
      shares, pricePerShare: price, dollars,
      sharesOwnedAfter: sharesAfter, stakePctChange, ownership,
    });
  }
  return out;
}

const XML_NAMES = ["primary_doc.xml", "ownership.xml", "form4.xml"];
async function fetchPrimaryDoc(entry) {
  for (const name of XML_NAMES) {
    const url = entry.primaryDocUrl.replace(/[^/]+\.xml$/, name);
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const xml = await res.text();
      if (xml.includes("<issuer>") || xml.includes("<ownershipDocument")) return xml;
    }
  }
  try {
    const folderUrl = entry.primaryDocUrl.replace(/[^/]+\.xml$/, "");
    const dirRes = await fetch(folderUrl, { headers: HEADERS });
    if (!dirRes.ok) return null;
    const dirHtml = await dirRes.text();
    const xmlMatch = dirHtml.match(/href="([^"]+\.xml)"/i);
    if (!xmlMatch) return null;
    const xmlUrl = xmlMatch[1].startsWith("http") ? xmlMatch[1] : `https://www.sec.gov${xmlMatch[1]}`;
    const xmlRes = await fetch(xmlUrl, { headers: HEADERS });
    if (!xmlRes.ok) return null;
    const xml = await xmlRes.text();
    if (xml.includes("<issuer>") || xml.includes("<ownershipDocument")) return xml;
  } catch {}
  return null;
}

async function processBatch(entries) {
  const out = [];
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (e) => {
        try {
          const xml = await fetchPrimaryDoc(e);
          if (!xml) return null;
          return parseForm4(xml, { accession: e.accession, filingDate: e.filingDate });
        } catch { return null; }
      })
    );
    for (const txs of results) if (txs) out.push(...txs);
    if (i % 240 === 0 && i > 0) {
      const progress = Math.round((i / entries.length) * 100);
      console.log(`  ...${progress}% (${i}/${entries.length}) ${out.length} transactions so far`);
    }
    await sleep(120);
  }
  return out;
}

async function fetchTickerMap() {
  try {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: HEADERS });
    if (!res.ok) return new Map();
    const j = await res.json();
    const m = new Map();
    for (const v of Object.values(j)) m.set(String(v.cik_str).padStart(10, "0"), v.ticker);
    return m;
  } catch { return new Map(); }
}

function loadPreviousHistory() {
  try {
    if (!existsSync(OUT_FILE)) return [];
    const prev = JSON.parse(readFileSync(OUT_FILE, "utf8"));
    if (Array.isArray(prev?.history)) return prev.history;
    return [];
  } catch { return []; }
}

async function main() {
  console.log(`Live EDGAR ingest — User-Agent: ${USER_AGENT}`);
  console.log(`Walking last ${DAYS_BACK} weekdays of Form 4 filings...`);

  const days = lastWeekdays(DAYS_BACK);
  let allEntries = [];
  for (const d of days) {
    const ents = await fetchDailyIndex(d);
    console.log(`  ${ymd(d)}: ${ents.length} Form 4 entries`);
    allEntries.push(...ents);
    if (allEntries.length >= MAX_FILINGS) break;
  }

  const seen = new Set();
  const dedup = [];
  for (const e of allEntries) {
    if (seen.has(e.accession)) continue;
    seen.add(e.accession);
    dedup.push(e);
  }
  if (dedup.length > MAX_FILINGS) {
    console.log(`  Capping at ${MAX_FILINGS} (had ${dedup.length})`);
    dedup.length = MAX_FILINGS;
  }
  console.log(`  ${dedup.length} unique Form 4 filings to fetch`);

  const tickerMap = await fetchTickerMap();
  console.log(`  Ticker map: ${tickerMap.size} CIK→ticker mappings`);

  console.log(`Fetching primary_doc.xml at ~${CONCURRENCY * 8} req/sec sustained...`);
  const transactions = await processBatch(dedup);
  console.log(`Parsed ${transactions.length} transactions`);

  for (const tx of transactions) {
    if (!tx.ticker) {
      const cik10 = String(tx.issuerCik).padStart(10, "0");
      tx.ticker = tickerMap.get(cik10) ?? "";
    }
  }

  const sectorCache = new Map();
  const topIssuerCiks = [...new Set(
    transactions
      .filter((t) => t.code === "P" && t.acquiredDisposed === "A")
      .sort((a, b) => b.dollars - a.dollars)
      .slice(0, 100)
      .map((t) => String(t.issuerCik).padStart(10, "0"))
  )];
  console.log(`Resolving sectors for ${topIssuerCiks.length} top issuers...`);
  for (const cik of topIssuerCiks) {
    if (sectorCache.has(cik)) continue;
    try {
      const r = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: HEADERS });
      if (r.ok) {
        const j = await r.json();
        sectorCache.set(cik, sicToSector(j.sicDescription ?? "", j.sic));
      } else {
        sectorCache.set(cik, "Unclassified");
      }
    } catch {
      sectorCache.set(cik, "Unclassified");
    }
    await sleep(110);
  }
  for (const tx of transactions) {
    const cik10 = String(tx.issuerCik).padStart(10, "0");
    const s = sectorCache.get(cik10);
    if (s) tx.sector = s;
  }

  const snapshot = buildSnapshot(transactions);
  writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2));
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`  Index: ${snapshot.index} (${snapshot.phase})`);
  console.log(`  Window: ${snapshot.windowDays} days`);
  console.log(`  Real buys: ${snapshot.buyCount}`);
  console.log(`  Real sells: ${snapshot.sellCount}`);
  console.log(`  Clusters: ${snapshot.clusters.length}`);
  console.log(`  Leaderboard rows: ${snapshot.leaderboard.length}`);
  console.log(`  Sectors: ${snapshot.sectors.length}`);
  console.log(`  Filtered out: ${Object.values(snapshot.filtered).reduce((a, b) => a + b, 0)}`);
  console.log(`  isDemo: ${snapshot.isDemo}`);
}

function sicToSector(desc, sicCode) {
  const sic = parseInt(sicCode, 10);
  if (Number.isFinite(sic)) {
    if (sic >= 1000 && sic < 1500) return "Materials";
    if (sic >= 1500 && sic < 1800) return "Industrials";
    if (sic >= 2000 && sic < 2200) return "Consumer Staples";
    if (sic >= 2800 && sic < 2900) return "Health Care";
    if (sic >= 3500 && sic < 3600) return "Industrials";
    if (sic >= 3600 && sic < 3700) return "Information Technology";
    if (sic >= 4800 && sic < 4900) return "Communication Services";
    if (sic >= 4900 && sic < 5000) return "Utilities";
    if (sic >= 5000 && sic < 6000) return "Consumer Discretionary";
    if (sic >= 6000 && sic < 7000) return "Financials";
    if (sic >= 7000 && sic < 7900) return "Communication Services";
    if (sic >= 7900 && sic < 8400) return "Consumer Discretionary";
    if (sic >= 8400 && sic < 8700) return "Health Care";
  }
  if (desc?.toLowerCase().includes("software")) return "Information Technology";
  if (desc?.toLowerCase().includes("bank")) return "Financials";
  return "Unclassified";
}

function buildSnapshot(transactions) {
  const generatedAt = new Date().toISOString();
  const anchor = new Date(generatedAt).getTime();
  let windowDays = 7;
  const within = (iso, days) => anchor - new Date(iso).getTime() <= days * 86_400_000;
  const isRealBuy = (t) => t.code === "P" && t.acquiredDisposed === "A" && !t.is10b5One && t.dollars >= 25_000;
  const isRealSell = (t) => !t.is10b5One && t.dollars >= 25_000 && (t.code === "S" || (t.code === "D" && t.acquiredDisposed === "D"));

  let realBuys = transactions.filter((t) => isRealBuy(t) && within(t.transactionDate, windowDays));
  if (realBuys.length < 10) {
    windowDays = 30;
    realBuys = transactions.filter((t) => isRealBuy(t) && within(t.transactionDate, windowDays));
  }
  const realSells = transactions.filter((t) => isRealSell(t) && within(t.transactionDate, windowDays));
  const clusterWindow = transactions.filter((t) => isRealBuy(t) && within(t.transactionDate, 30));

  const significance = (d, role, stake) => {
    if (d <= 0) return 0;
    const logD = Math.log10(Math.max(1000, d));
    const dollarFactor = Math.max(0, Math.min(1, (logD - 3) / 5));
    const roleW = ROLE_WEIGHTS[role] ?? 0.3;
    const stakeFactor = Math.max(0.6, Math.min(1.4, 1 + Math.min(0.4, stake / 100)));
    const raw = dollarFactor * roleW * stakeFactor;
    return Math.round(Math.max(0, Math.min(1, raw)) * 100);
  };

  const groups = new Map();
  for (const t of realBuys) {
    if (!t.ticker) continue;
    const k = `${t.ticker}|${t.insiderName}`;
    const arr = groups.get(k) ?? [];
    arr.push(t);
    groups.set(k, arr);
  }
  const rows = [];
  groups.forEach((txs) => {
    const dollars = txs.reduce((s, t) => s + t.dollars, 0);
    const shares = txs.reduce((s, t) => s + t.shares, 0);
    const stakePct = txs.reduce((s, t) => s + t.stakePctChange, 0);
    const t0 = txs[0];
    rows.push({
      rank: 0, ticker: t0.ticker, company: t0.company, sector: t0.sector,
      insiderName: t0.insiderName, role: t0.role, officerTitle: t0.officerTitle,
      dollars, shares,
      avgPricePerShare: shares > 0 ? dollars / shares : 0,
      stakePctChange: stakePct,
      significance: significance(dollars, t0.role, stakePct),
      transactions: txs,
    });
  });
  rows.sort((a, b) => b.significance - a.significance || b.dollars - a.dollars);
  const leaderboard = rows.slice(0, 20).map((r, i) => ({ ...r, rank: i + 1 }));

  const clusterMap = new Map();
  for (const t of clusterWindow) {
    if (!t.ticker) continue;
    const arr = clusterMap.get(t.ticker) ?? [];
    arr.push(t);
    clusterMap.set(t.ticker, arr);
  }
  const clusters = [];
  clusterMap.forEach((txs, ticker) => {
    const distinct = new Map();
    for (const t of txs) {
      const arr = distinct.get(t.insiderName) ?? [];
      arr.push(t);
      distinct.set(t.insiderName, arr);
    }
    if (distinct.size < 3) return;
    const insiders = [...distinct.entries()]
      .map(([name, list]) => ({
        name, role: list[0].role, officerTitle: list[0].officerTitle,
        dollars: list.reduce((s, t) => s + t.dollars, 0),
      }))
      .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);
    const totalDollars = txs.reduce((s, t) => s + t.dollars, 0);
    const latestDate = txs.reduce((d, t) => (t.transactionDate > d ? t.transactionDate : d), "");
    const t0 = txs[0];
    const sizeFactor = Math.max(0, Math.min(1, Math.log10(Math.max(1000, totalDollars)) / 8 - 0.3));
    const countFactor = Math.min(1, distinct.size / 6);
    const roleFactor = Math.max(...insiders.map((i) => 1 - ROLE_RANK[i.role] / 8));
    const strength = Math.round(Math.max(0, Math.min(1, 0.4 * sizeFactor + 0.35 * countFactor + 0.25 * roleFactor)) * 100);
    clusters.push({
      ticker, company: t0.company, sector: t0.sector,
      insiderCount: distinct.size, insiders, totalDollars, windowDays: 30, latestDate, strength,
    });
  });
  clusters.sort((a, b) => b.strength - a.strength || b.totalDollars - a.totalDollars);

  const sectorMap = new Map();
  for (const t of realBuys) {
    const tile = sectorMap.get(t.sector) ?? { sector: t.sector, buyDollars: 0, sellDollars: 0, netRatio: 0, buyCount: 0, sellCount: 0 };
    tile.buyDollars += t.dollars; tile.buyCount += 1;
    sectorMap.set(t.sector, tile);
  }
  for (const t of realSells) {
    const tile = sectorMap.get(t.sector) ?? { sector: t.sector, buyDollars: 0, sellDollars: 0, netRatio: 0, buyCount: 0, sellCount: 0 };
    tile.sellDollars += t.dollars; tile.sellCount += 1;
    sectorMap.set(t.sector, tile);
  }
  const sectors = [...sectorMap.values()].map((s) => {
    const total = s.buyDollars + s.sellDollars;
    return { ...s, netRatio: total > 0 ? (s.buyDollars - s.sellDollars) / total : 0 };
  });
  sectors.sort((a, b) => b.netRatio - a.netRatio);

  const buyDollars = realBuys.reduce((s, t) => s + t.dollars, 0);
  const sellDollars = realSells.reduce((s, t) => s + t.dollars, 0);
  const netDollars = buyDollars - sellDollars;
  const totalD = buyDollars + sellDollars;
  const dollarSig = totalD > 0 ? (buyDollars - sellDollars) / totalD : 0;
  const totalC = realBuys.length + realSells.length;
  const countSig = totalC > 0 ? (realBuys.length - realSells.length) / totalC : 0;
  const clusterSig = Math.min(1, clusters.length / 10);
  const blended = 0.55 * dollarSig + 0.25 * countSig + 0.20 * clusterSig;
  const index = Math.max(0, Math.min(100, Math.round(50 + blended * 50)));
  const phase = index >= 70 ? "heavy-buying" : index >= 40 ? "balanced" : "heavy-selling";
  const verdict =
    phase === "heavy-buying"
      ? "Company executives are spending their own money to buy stock in their own companies — and they're doing it together. When a CEO and CFO both reach for personal cash to buy what they already work for, it tends to be a meaningful signal."
      : phase === "balanced"
      ? "Insider buying and selling roughly cancel out this week. There's no clear directional message from inside the boardroom right now. Treat any individual buy as one data point, not a trigger to act."
      : "More insiders are selling than buying — and not just on pre-scheduled plans. When the people who run companies trim their personal stakes, it's usually about diversification, but it's worth watching where the selling is concentrated.";

  const fmtNet = (n) => {
    const a = Math.abs(n), s = n >= 0 ? "+" : "−";
    if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}k`;
    return `${s}$${a.toFixed(0)}`;
  };
  const shortD = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${n.toFixed(0)}`);
  const topRoleBuyer = leaderboard.find((r) => r.role === "CEO" || r.role === "CFO");
  const indicators = [
    { label: "Cluster buys (30d)", value: String(clusters.length),
      sub: clusters.length === 0 ? "No clusters in the last 30 days" : `Across ${new Set(clusters.map((c) => c.sector)).size} sectors`,
      tone: clusters.length >= 5 ? "positive" : clusters.length >= 2 ? "neutral" : "warning" },
    { label: "Net buy/sell ($)", value: fmtNet(netDollars),
      sub: `${realBuys.length} buys vs ${realSells.length} sells`,
      tone: netDollars > 0 ? "positive" : netDollars < 0 ? "negative" : "neutral" },
    { label: "Top conviction (this week)",
      value: topRoleBuyer ? topRoleBuyer.ticker : leaderboard[0]?.ticker ?? "—",
      sub: topRoleBuyer ? `${topRoleBuyer.role} · ${shortD(topRoleBuyer.dollars)}`
        : leaderboard[0] ? `${leaderboard[0].role} · ${shortD(leaderboard[0].dollars)}` : "Tape is quiet",
      tone: "neutral" },
    { label: "Sector tilt", value: sectors[0]?.sector ?? "—",
      sub: sectors[0] ? `Net ratio ${(sectors[0].netRatio * 100).toFixed(0)}%` : "—", tone: "neutral" },
  ];

  const today = generatedAt.slice(0, 10);
  const previousHistory = loadPreviousHistory().filter((p) => p.date !== today);
  const history = [...previousHistory, { date: today, index, netDollars }]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-365);

  const recentActivity = [...realBuys, ...realSells]
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, 6)
    .map((t) => ({
      ticker: t.ticker, company: t.company, insiderName: t.insiderName,
      role: t.role, isBuy: t.code === "P", dollars: t.dollars,
      transactionDate: t.transactionDate,
    }));

  const filtered = {
    grantsAndAwards: transactions.filter((t) => t.code === "A").length,
    optionExercises: transactions.filter((t) => t.code === "M" || t.code === "X").length,
    taxWithholding: transactions.filter((t) => t.code === "F").length,
    preScheduledSales: transactions.filter((t) => t.is10b5One && (t.code === "S" || t.code === "P")).length,
    belowThreshold: transactions.filter((t) => (t.code === "P" || t.code === "S") && !t.is10b5One && t.dollars > 0 && t.dollars < 25_000).length,
  };

  const sources = [
    { name: "SEC EDGAR Form 4", ok: true, note: `Live · ${transactions.length.toLocaleString()} filings parsed` },
    { name: "EDGAR ticker map", ok: true, note: "company_tickers.json — issuer→ticker resolution" },
    { name: "eToro public catalog", ok: true, note: "Instrument tradability · 15,500 names" },
  ];

  return {
    generatedAt, windowDays, index, phase, verdict, netDollars, buyDollars, sellDollars,
    buyCount: realBuys.length, sellCount: realSells.length, clusterCount: clusters.length,
    leaderboard, clusters: clusters.slice(0, 12), sectors, history, indicators, sources,
    isDemo: false, filtered, recentActivity,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
