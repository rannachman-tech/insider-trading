/**
 * Build the v1 ship snapshot from the deterministic seed data.
 * Run any time you want to refresh the bundled data without hitting EDGAR.
 *
 *   npm run seed
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildSeedHistory, buildSeedTransactions } from "../lib/seed";
import { buildSnapshot } from "../lib/snapshot";

const OUT_DIR = join(process.cwd(), "data");
const OUT_FILE = join(OUT_DIR, "insider-snapshot.json");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const generatedAt = new Date().toISOString();
const txs = buildSeedTransactions(generatedAt);
const snapshot = buildSnapshot(txs, {
  generatedAt,
  windowDays: 7,
  clusterWindowDays: 30,
  clusterMinInsiders: 3,
  isDemo: true,
});
snapshot.history = buildSeedHistory(generatedAt, snapshot.index);
snapshot.sources = snapshot.sources.map((s) =>
  s.name.includes("EDGAR") ? { ...s, note: "Demo mode — live ingest scheduled" } : s
);

writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2));
console.log(`Seeded ${OUT_FILE}`);
console.log(`  Index: ${snapshot.index} (${snapshot.phase})`);
console.log(`  Leaderboard: ${snapshot.leaderboard.length}`);
console.log(`  Clusters: ${snapshot.clusters.length}`);
console.log(`  Sectors: ${snapshot.sectors.length}`);
