/**
 * Live EDGAR ingest — runs in CI (GitHub Actions) on a schedule.
 *
 * 1. Pull latest 100 Form 4 filings from the public atom feed
 * 2. Fetch each filing's primary_doc.xml
 * 3. Parse → InsiderTransaction
 * 4. Apply filters and build the snapshot
 * 5. Write data/insider-snapshot.json
 *
 * Throttled at <10 req/s to respect SEC fair-use policy.
 *
 * NOTE: The default 100-filing window is intentional — it's enough for a smoke
 * test in CI and small enough to run in <2 min. Production scheduling should
 * widen this to ~1000 filings (last ~24h) and re-run nightly.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EDGAR_ATOM_URL,
  EDGAR_HEADERS,
  parseForm4,
} from "../lib/edgar";
import { buildSnapshot } from "../lib/snapshot";
import { buildSeedTransactions, buildSeedHistory } from "../lib/seed";
import type { InsiderTransaction } from "../lib/types";

const OUT_DIR = join(process.cwd(), "data");
const OUT_FILE = join(OUT_DIR, "insider-snapshot.json");
const SECTOR_CACHE = join(OUT_DIR, "sector-cache.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAtom(): Promise<string[]> {
  const url = EDGAR_ATOM_URL("4", 100);
  const res = await fetch(url, { headers: EDGAR_HEADERS });
  if (!res.ok) throw new Error(`EDGAR atom HTTP ${res.status}`);
  const xml = await res.text();
  // Pull every <link rel="alternate" type="text/html" href="..." />
  // — these point at filing index pages.
  const re = /<link[^>]+rel="alternate"[^>]+href="([^"]+)"/gi;
  const out: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    const href = m[1];
    // Only keep filings that are clearly Form 4 by URL path (not the feed self-link)
    if (href.includes("/Archives/edgar/data/") && href.includes("-index.htm")) {
      out.push(href.startsWith("http") ? href : `https://www.sec.gov${href}`);
    }
  }
  return out;
}

async function fetchPrimaryDoc(indexUrl: string): Promise<{ xml: string; accession: string; filingDate: string } | null> {
  const idxRes = await fetch(indexUrl, { headers: EDGAR_HEADERS });
  if (!idxRes.ok) return null;
  const idx = await idxRes.text();
  const accession = (indexUrl.match(/(\d{10}-\d{2}-\d{6})/) ?? [])[0] ?? "unknown";
  const filingDateMatch = idx.match(/Filing Date<\/div>\s*<div class="info">(\d{4}-\d{2}-\d{2})/);
  const filingDate = filingDateMatch?.[1] ?? new Date().toISOString().slice(0, 10);
  const docMatch = idx.match(/href="([^"]+primary_doc\.xml)"/i);
  if (!docMatch) return null;
  const docUrl = docMatch[1].startsWith("http")
    ? docMatch[1]
    : `https://www.sec.gov${docMatch[1]}`;
  const docRes = await fetch(docUrl, { headers: EDGAR_HEADERS });
  if (!docRes.ok) return null;
  const xml = await docRes.text();
  return { xml, accession, filingDate };
}

const SECTORS_BY_PREFIX: Array<[RegExp, string]> = [
  [/^28|^283/, "Health Care"],
  [/^36|^357|^367/, "Information Technology"],
  [/^60|^61|^62|^63/, "Financials"],
  [/^48|^491|^492/, "Communication Services"],
  [/^53|^54|^57|^58/, "Consumer Discretionary"],
  [/^20|^21/, "Consumer Staples"],
  [/^13|^29/, "Energy"],
  [/^33|^35/, "Industrials"],
];

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();

  let txs: InsiderTransaction[] = [];
  let liveOk = true;

  try {
    console.log("Pulling EDGAR atom feed...");
    const indexUrls = await fetchAtom();
    console.log(`  Found ${indexUrls.length} candidate filings`);

    for (const url of indexUrls) {
      try {
        const doc = await fetchPrimaryDoc(url);
        if (!doc) continue;
        const parsed = parseForm4(doc.xml, {
          accession: doc.accession,
          filingDate: doc.filingDate,
        });
        txs.push(...parsed);
      } catch (err) {
        console.warn(`  skip ${url}: ${(err as Error).message}`);
      }
      await sleep(120); // ~8 req/s, well under the 10 limit
    }
    console.log(`  Parsed ${txs.length} transactions`);
  } catch (err) {
    console.error("Live ingest failed, falling back to seed:", (err as Error).message);
    liveOk = false;
  }

  let isDemo = false;
  if (txs.length < 30) {
    console.warn("Too few real transactions — augmenting with seed data");
    txs = [...txs, ...buildSeedTransactions(generatedAt)];
    isDemo = true;
  }

  // Build snapshot
  const snapshot = buildSnapshot(txs, {
    generatedAt,
    windowDays: 7,
    clusterWindowDays: 30,
    clusterMinInsiders: 3,
    isDemo,
  });
  snapshot.history = buildSeedHistory(generatedAt, snapshot.index);
  if (!liveOk || isDemo) {
    snapshot.sources = snapshot.sources.map((s) =>
      s.name.includes("EDGAR") ? { ...s, ok: false, note: "Live fetch unavailable — using seed" } : s
    );
  }

  writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2));
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`  Index: ${snapshot.index} (${snapshot.phase})`);
  console.log(`  Leaderboard rows: ${snapshot.leaderboard.length}`);
  console.log(`  Clusters: ${snapshot.clusters.length}`);
  console.log(`  Sectors: ${snapshot.sectors.length}`);
  console.log(`  Demo mode: ${snapshot.isDemo}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
