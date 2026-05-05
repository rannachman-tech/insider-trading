const CATALOG_URL = "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments";

const STOCKS = [
  { ticker: "AAPL", symbolFull: "AAPL", instrumentId: 1001 },
  { ticker: "ABBV", symbolFull: "ABBV", instrumentId: 1452 },
  { ticker: "AFRM", symbolFull: "AFRM", instrumentId: 8108 },
  { ticker: "AMZN", symbolFull: "AMZN", instrumentId: 1005 },
  { ticker: "BAC",  symbolFull: "BAC",  instrumentId: 1011 },
  { ticker: "COST", symbolFull: "COST", instrumentId: 1461 },
  { ticker: "CRWD", symbolFull: "CRWD", instrumentId: 5506 },
  { ticker: "DKNG", symbolFull: "DKNG", instrumentId: 7990 },
  { ticker: "ENPH", symbolFull: "ENPH", instrumentId: 5634 },
  { ticker: "F",    symbolFull: "F",    instrumentId: 1112 },
  { ticker: "KMI",  symbolFull: "KMI",  instrumentId: 1601 },
  { ticker: "LULU", symbolFull: "LULU", instrumentId: 4309 },
  { ticker: "META", symbolFull: "META", instrumentId: 1003 },
  { ticker: "NVDA", symbolFull: "NVDA", instrumentId: 1137 },
  { ticker: "ORCL", symbolFull: "ORCL", instrumentId: 1135 },
  { ticker: "PYPL", symbolFull: "PYPL", instrumentId: 1484 },
  { ticker: "SOFI", symbolFull: "SOFI", instrumentId: 9255 },
  { ticker: "TSLA", symbolFull: "TSLA", instrumentId: 1111 },
  { ticker: "UAL",  symbolFull: "UAL",  instrumentId: 1524 },
  { ticker: "WMT",  symbolFull: "WMT",  instrumentId: 1035 },
  { ticker: "VTI",  symbolFull: "VTI",  instrumentId: 4237 },
  { ticker: "DGRO", symbolFull: "DGRO", instrumentId: 3149 },
  { ticker: "SHV",  symbolFull: "SHV",  instrumentId: 4321 },
  { ticker: "IAU",  symbolFull: "IAU",  instrumentId: 4365 },
  { ticker: "USMV", symbolFull: "USMV", instrumentId: 4292 },
  { ticker: "TLT",  symbolFull: "TLT",  instrumentId: 3020 },
];

const res = await fetch(CATALOG_URL);
if (!res.ok) { console.error(`HTTP ${res.status}`); process.exit(1); }
const json = await res.json();
const items = json.InstrumentDisplayDatas ?? Object.values(json)[0];
const cat = new Map(items.map(it => [it.InstrumentID, it]));
const failures = [];
const ok = [];
for (const h of STOCKS) {
  const e = cat.get(h.instrumentId);
  if (!e) { failures.push(`X ${h.ticker} (id=${h.instrumentId}) not in catalog`); continue; }
  const cs = (e.SymbolFull ?? "").toUpperCase(), hs = h.symbolFull.toUpperCase();
  if (cs !== hs) { failures.push(`X ${h.ticker} drift: ${cs} vs ${hs}`); continue; }
  ok.push(`OK ${h.ticker.padEnd(6)} -> id=${h.instrumentId}`);
}
ok.forEach(s => console.log(s));
if (failures.length) { failures.forEach(f => console.log(f)); console.log(`\n${failures.length} FAILED`); process.exit(1); }
console.log(`\nAll ${ok.length} entries verified`);
