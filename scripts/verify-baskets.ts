/**
 * Verify every BasketHolding's instrumentId resolves against the live
 * eToro public catalog and that SymbolFull matches what we hard-coded.
 *
 * No API keys required.
 */

import { allHoldings } from "../lib/baskets";

const CATALOG_URL =
  "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments";

interface Entry {
  InstrumentID: number;
  SymbolFull?: string;
  InstrumentDisplayName?: string;
  InstrumentTypeID?: number;
}

async function main() {
  console.log("Fetching eToro public catalog...");
  const res = await fetch(CATALOG_URL);
  if (!res.ok) {
    console.error(`Catalog fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const items: Entry[] =
    (json.InstrumentDisplayDatas as Entry[]) ??
    (json.Instruments as Entry[]) ??
    (Object.values(json)[0] as Entry[]);

  if (!Array.isArray(items)) {
    console.error("Catalog shape unexpected — expected an array");
    process.exit(1);
  }
  console.log(`  Loaded ${items.length} instruments`);

  const cat = new Map(items.map((it) => [it.InstrumentID, it]));
  const failures: string[] = [];
  const successes: string[] = [];

  for (const h of allHoldings()) {
    const entry = cat.get(h.instrumentId);
    if (!entry) {
      failures.push(
        `X ${h.ticker} (id=${h.instrumentId}) — not in catalog`
      );
      continue;
    }
    const cs = (entry.SymbolFull ?? "").toUpperCase();
    const hs = h.symbolFull.toUpperCase();
    if (cs !== hs) {
      failures.push(
        `X ${h.ticker} (id=${h.instrumentId}) — drift: catalog says "${cs}", we have "${hs}"`
      );
      continue;
    }
    successes.push(`OK ${h.ticker.padEnd(6)} → id=${h.instrumentId}`);
  }

  successes.forEach((s) => console.log(s));

  if (failures.length) {
    console.log("");
    failures.forEach((f) => console.log(f));
    console.log(`\n${failures.length} basket(s) FAILED verification`);
    process.exit(1);
  }
  console.log(`\nAll ${successes.length} baskets verified against live catalog`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
