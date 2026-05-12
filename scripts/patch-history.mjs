// Quick patch: drop history points whose netDollars value is wildly out of
// range from a real daily insider net-flow (-50B..+50B). The original
// backfill produced ~$2.4 quadrillion values for early days due to a
// parser edge case (shares*price not capped at the display layer).
//
// After running this, the chart will show real recent days (legitimate
// ±$1-5B values) plus the "accumulating" empty state for older days.
// To re-fill those days with real data, run scripts/recompute-history.mjs
// (slower; re-parses the full cache with a sanity filter).
//
//   node scripts/patch-history.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = join(process.cwd(), "data", "insider-snapshot.json");
const SANE_MAX = 50_000_000_000; // $50B/day is roughly the all-time peak

const snap = JSON.parse(readFileSync(FILE, "utf8"));
const before = snap.history?.length ?? 0;
const dropped = [];
snap.history = (snap.history ?? []).filter((p) => {
  const ok = Math.abs(p.netDollars) <= SANE_MAX && Number.isFinite(p.netDollars);
  if (!ok) dropped.push({ date: p.date, netDollars: p.netDollars });
  return ok;
});
writeFileSync(FILE, JSON.stringify(snap, null, 2));

console.log(`History points: ${before} → ${snap.history.length} (dropped ${dropped.length})`);
if (dropped.length) {
  console.log(`\nFirst 5 dropped points (date · netDollars):`);
  for (const d of dropped.slice(0, 5)) {
    console.log(`  ${d.date}  ${d.netDollars.toExponential(2)}`);
  }
}

const fmt = (n) => (n >= 0 ? "+$" : "−$") + (Math.abs(n) >= 1e9 ? (Math.abs(n) / 1e9).toFixed(2) + "B" : (Math.abs(n) / 1e6).toFixed(1) + "M");
console.log(`\nKept range: ${snap.history[0]?.date} → ${snap.history.at(-1)?.date}`);
if (snap.history.length) {
  const vals = snap.history.map((p) => p.netDollars);
  console.log(`Min netFlow: ${fmt(Math.min(...vals))}`);
  console.log(`Max netFlow: ${fmt(Math.max(...vals))}`);
}
