/**
 * Comprehensive basket simulator — 9 sections of invariants.
 *
 * Runs in CI without API keys. Catches drift, missing baskets, broken
 * allocation math, illegal weights, etc.
 *
 *   npm run simulate:baskets
 */

import { BASKETS, allocate, allHoldings, basketFor } from "../lib/baskets";
import { phaseFor } from "../lib/phase";
import type { Phase } from "../lib/types";

const PHASES: Phase[] = ["heavy-buying", "balanced", "heavy-selling"];

const failures: string[] = [];
const fail = (msg: string) => {
  failures.push(msg);
  console.log(`X ${msg}`);
};
const ok = (msg: string) => console.log(`OK ${msg}`);

// 1. Coverage — every phase has a basket
console.log("\n--- 1. Coverage ---");
for (const p of PHASES) {
  if (!BASKETS[p]) fail(`No basket for phase=${p}`);
  else ok(`Basket for ${p}`);
}

// 2. Invariants
console.log("\n--- 2. Invariants ---");
for (const p of PHASES) {
  const b = BASKETS[p];
  const sum = b.holdings.reduce((s, h) => s + h.weight, 0);
  if (Math.abs(sum - 100) > 0.01) fail(`${p} weights sum ${sum} != 100`);
  else ok(`${p} weights sum to 100`);
  if (b.holdings.length < 3) fail(`${p} has ${b.holdings.length} holdings (min 3)`);
  if (b.holdings.length > 10) fail(`${p} has ${b.holdings.length} holdings (max 10)`);
  for (const h of b.holdings) {
    if (h.weight <= 0) fail(`${p}/${h.ticker} weight ${h.weight} <= 0`);
    if (h.weight > 55) fail(`${p}/${h.ticker} weight ${h.weight} > 55%`);
    if (!Number.isFinite(h.instrumentId) || h.instrumentId <= 0)
      fail(`${p}/${h.ticker} instrumentId invalid: ${h.instrumentId}`);
    if (!h.ticker || !h.symbolFull) fail(`${p}/${h.ticker} missing ticker or symbolFull`);
    if (!h.shortRationale || !h.longRationale)
      fail(`${p}/${h.ticker} missing rationale`);
  }
  ok(`${p} invariants pass (${b.holdings.length} holdings)`);
}

// 3. Field consistency
console.log("\n--- 3. Field consistency ---");
for (const p of PHASES) {
  const b = BASKETS[p];
  if (b.phase !== p) fail(`${p} basket.phase mismatch (says ${b.phase})`);
  else ok(`${p} basket.phase consistent`);
}

// 4. phaseFor edge cases
console.log("\n--- 4. phaseFor edge cases ---");
const cases: Array<[number, Phase]> = [
  [-100, "heavy-selling"],
  [-1, "heavy-selling"],
  [0, "heavy-selling"],
  [39.999, "heavy-selling"],
  [40, "balanced"],
  [69.999, "balanced"],
  [70, "heavy-buying"],
  [100, "heavy-buying"],
  [200, "heavy-buying"],
  [Number.NaN, "balanced"],
];
for (const [score, expected] of cases) {
  const got = phaseFor(score);
  if (got !== expected) fail(`phaseFor(${score}) → ${got}, expected ${expected}`);
  else ok(`phaseFor(${score}) → ${got}`);
}

// 5. Routing matrix
console.log("\n--- 5. Routing matrix ---");
for (const p of PHASES) {
  const b = basketFor(p);
  if (b.phase !== p) fail(`basketFor(${p}).phase = ${b.phase}`);
  else ok(`basketFor(${p}) routes correctly`);
}

// 6. Allocation math
console.log("\n--- 6. Allocation math ---");
const amounts = [1000, 1, 0.1, 100000, 333, 999.99, 50, 10000];
for (const p of PHASES) {
  const b = BASKETS[p];
  for (const amt of amounts) {
    const allocs = allocate(b, amt);
    const total = allocs.reduce((s, a) => s + a.dollars, 0);
    // Allow 1% rounding tolerance
    if (Math.abs(total - amt) / Math.max(0.01, amt) > 0.01)
      fail(`${p} allocate(${amt}) sums to ${total}`);
  }
  ok(`${p} allocation math holds across ${amounts.length} amounts`);
}

// 7. Cross-basket consistency: same ticker, same instrumentId everywhere it appears
console.log("\n--- 7. Cross-basket consistency ---");
const seenIds = new Map<string, number>();
const seenSyms = new Map<number, string>();
for (const h of allHoldings()) {
  const prevId = seenIds.get(h.symbolFull);
  if (prevId !== undefined && prevId !== h.instrumentId)
    fail(`${h.symbolFull} has instrumentId ${h.instrumentId} but earlier saw ${prevId}`);
  seenIds.set(h.symbolFull, h.instrumentId);
  const prevSym = seenSyms.get(h.instrumentId);
  if (prevSym !== undefined && prevSym !== h.symbolFull)
    fail(`instrumentId ${h.instrumentId} maps to ${h.symbolFull} but earlier saw ${prevSym}`);
  seenSyms.set(h.instrumentId, h.symbolFull);
}
ok(`${seenIds.size} unique symbol↔id pairs, all consistent`);

// 8. Defensive properties: no duplicate ticker within a single basket
console.log("\n--- 8. Defensive properties ---");
for (const p of PHASES) {
  const b = BASKETS[p];
  const tset = new Set(b.holdings.map((h) => h.symbolFull));
  if (tset.size !== b.holdings.length)
    fail(`${p} has duplicate symbolFull`);
  else ok(`${p} no duplicates`);
}

// 9. Live catalog cross-check (best-effort, only if reachable)
console.log("\n--- 9. Live catalog cross-check ---");
try {
  const r = await fetch(
    "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments"
  );
  if (!r.ok) {
    console.log("?  Catalog unreachable, skipping live check");
  } else {
    const j = (await r.json()) as Record<string, unknown>;
    const items = ((j.InstrumentDisplayDatas as any[]) ?? []) as Array<{
      InstrumentID: number;
      SymbolFull?: string;
    }>;
    const cat = new Map(items.map((it) => [it.InstrumentID, it]));
    for (const h of allHoldings()) {
      const e = cat.get(h.instrumentId);
      if (!e) fail(`${h.ticker} id=${h.instrumentId} not in live catalog`);
      else if ((e.SymbolFull ?? "").toUpperCase() !== h.symbolFull.toUpperCase())
        fail(`${h.ticker} drift: catalog ${e.SymbolFull} vs ${h.symbolFull}`);
    }
    ok(`Live catalog cross-check completed`);
  }
} catch (err) {
  console.log(`?  Live cross-check skipped: ${(err as Error).message}`);
}

console.log("\n========================");
if (failures.length) {
  console.log(`FAILED: ${failures.length} issue(s)`);
  process.exit(1);
}
console.log("ALL SECTIONS PASSED");
