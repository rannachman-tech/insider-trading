// Verify every basket instrumentId resolves against the live eToro public
// catalog. Self-contained mirror of scripts/verify-baskets.ts.
//
//   node scripts/verify-baskets.mjs

const CATALOG_URL =
  "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments";

// Mirror of lib/baskets.ts holdings (kept in sync manually).
const HOLDINGS = [
  { ticker: "DKNG", symbolFull: "DKNG", instrumentId: 7990 },
  { ticker: "PYPL", symbolFull: "PYPL", instrumentId: 1484 },
  { ticker: "ENPH", symbolFull: "ENPH", instrumentId: 5634 },
  { ticker: "F",    symbolFull: "F",    instrumentId: 1112 },
  { ticker: "VTI",  symbolFull: "VTI",  instrumentId: 4237 },
  { ticker: "DGRO", symbolFull: "DGRO", instrumentId: 3149 },
  { ticker: "WMT",  symbolFull: "WMT",  instrumentId: 1035 },
  { ticker: "COST", symbolFull: "COST", instrumentId: 1461 },
  { ticker: "SHV",  symbolFull: "SHV",  instrumentId: 4321 },
  { ticker: "IAU",  symbolFull: "IAU",  instrumentId: 4365 },
  { ticker: "USMV", symbolFull: "USMV", instrumentId: 4292 },
  { ticker: "TLT",  symbolFull: "TLT",  instrumentId: 3020 },
];

const res = await fetch(CATALOG_URL);
if (!res.ok) {
  console.error(`Catalog fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const json = await res.json();
const items = json.InstrumentDisplayDatas ?? json.Instruments ?? Object.values(json)[0];
if (!Array.isArray(items)) {
  console.error("Catalog shape unexpected");
  process.exit(1);
}
console.log(`Loaded ${items.length} instruments from catalog`);

const cat = new Map(items.map((it) => [it.InstrumentID, it]));
const failures = [];
const ok = [];

for (const h of HOLDINGS) {
  const e = cat.get(h.instrumentId);
  if (!e) {
    failures.push(`X ${h.ticker} (id=${h.instrumentId}) — not in catalog`);
    continue;
  }
  const cs = (e.SymbolFull ?? "").toUpperCase();
  const hs = h.symbolFull.toUpperCase();
  if (cs !== hs) {
    failures.push(`X ${h.ticker} (id=${h.instrumentId}) — drift: catalog says ${cs}, we have ${hs}`);
    continue;
  }
  ok.push(`OK ${h.ticker.padEnd(6)} → id=${h.instrumentId}`);
}

ok.forEach((s) => console.log(s));
if (failures.length) {
  console.log("");
  failures.forEach((f) => console.log(f));
  console.log(`\n${failures.length} holding(s) FAILED verification`);
  process.exit(1);
}
console.log(`\nAll ${ok.length} basket holdings verified against live eToro catalog`);
