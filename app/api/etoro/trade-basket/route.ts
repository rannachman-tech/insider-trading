/**
 * Execute a basket trade via eToro Public API.
 *
 * Body shape:
 *   { apiKey, userKey, env: "real"|"demo",
 *     basket: [{ ticker, amount, instrumentId? }] }
 *
 * `instrumentId` is optional — if omitted (or 0), we resolve the ticker
 * against eToro's public catalog at request time. This lets the dashboard
 * trade any ticker that appears in EDGAR, not just the ~28 hardcoded in
 * lib/stock-catalog.ts.
 *
 * Posts to /trading/execution/{demo/}market-open-orders/by-amount with
 * PascalCase body — gotcha #12 in the skill reference.
 */

export const runtime = "edge";

const ETORO_BASE = "https://public-api.etoro.com/api/v1";
const ETORO_CATALOG_URL =
  "https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments";

interface BasketTrade {
  apiKey: string;
  userKey: string;
  env: "real" | "demo";
  basket: Array<{ ticker: string; instrumentId?: number; amount: number }>;
}

// Module-scope cache of the public catalog. Edge invocations are short-lived
// so this is best-effort, not a strong guarantee — but it does help when
// resolving a multi-ticker basket in a single request.
let catalogCache: Map<string, number> | null = null;
let catalogFetchedAt = 0;
const CATALOG_TTL_MS = 60 * 60 * 1000; // 1h

async function getTickerToIdMap(): Promise<Map<string, number>> {
  if (catalogCache && Date.now() - catalogFetchedAt < CATALOG_TTL_MS) {
    return catalogCache;
  }
  const res = await fetch(ETORO_CATALOG_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Catalog HTTP ${res.status}`);
  const json = (await res.json()) as {
    InstrumentDisplayDatas?: Array<{ InstrumentID: number; SymbolFull?: string }>;
  };
  const items =
    json.InstrumentDisplayDatas ??
    (Object.values(json)[0] as Array<{ InstrumentID: number; SymbolFull?: string }>);
  const map = new Map<string, number>();
  for (const it of items ?? []) {
    if (it?.SymbolFull && typeof it.InstrumentID === "number") {
      map.set(it.SymbolFull.toUpperCase(), it.InstrumentID);
    }
  }
  catalogCache = map;
  catalogFetchedAt = Date.now();
  return map;
}

function makeRequestId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const hdrs = (apiKey: string, userKey: string) => ({
  "x-api-key": apiKey,
  "x-user-key": userKey,
  "x-request-id": makeRequestId(),
  "content-type": "application/json",
  accept: "application/json",
});

export async function POST(req: Request) {
  let body: BasketTrade;
  try {
    body = (await req.json()) as BasketTrade;
  } catch {
    return Response.json({ ok: false, message: "Bad JSON body" }, { status: 400 });
  }
  const { apiKey, userKey, env, basket } = body;
  if (!apiKey || !userKey || !Array.isArray(basket) || basket.length === 0) {
    return Response.json({ ok: false, message: "Missing required fields" }, { status: 400 });
  }

  const url = `${ETORO_BASE}/trading/execution/${env === "demo" ? "demo/" : ""}market-open-orders/by-amount`;
  const results: Array<{ ticker: string; ok: boolean; message?: string }> = [];

  // Resolve any missing instrumentIds against the public catalog up front,
  // so we only fetch it once even for multi-ticker baskets.
  const needsResolve = basket.some((h) => !h.instrumentId || h.instrumentId <= 0);
  let tickerMap: Map<string, number> | null = null;
  if (needsResolve) {
    try {
      tickerMap = await getTickerToIdMap();
    } catch (err) {
      return Response.json(
        { ok: false, message: `Could not load eToro catalog: ${(err as Error).message}` },
        { status: 502 }
      );
    }
  }

  for (const h of basket) {
    if (h.amount < 1) {
      results.push({ ticker: h.ticker, ok: false, message: "Amount below $1" });
      continue;
    }
    let instrumentId = h.instrumentId ?? 0;
    if (!instrumentId || instrumentId <= 0) {
      const resolved = tickerMap?.get((h.ticker ?? "").toUpperCase());
      if (!resolved) {
        results.push({
          ticker: h.ticker,
          ok: false,
          message: `Ticker not tradeable on eToro (no instrument match)`,
        });
        continue;
      }
      instrumentId = resolved;
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: hdrs(apiKey, userKey),
        body: JSON.stringify({
          InstrumentID: instrumentId,
          IsBuy: true,
          Leverage: 1,
          Amount: h.amount,
        }),
      });
      if (res.ok) {
        results.push({ ticker: h.ticker, ok: true });
      } else {
        const txt = await res.text().catch(() => "");
        results.push({ ticker: h.ticker, ok: false, message: `HTTP ${res.status} ${truncate(txt, 80)}` });
      }
    } catch (err) {
      results.push({ ticker: h.ticker, ok: false, message: (err as Error).message });
    }
  }

  return Response.json({ ok: results.every((r) => r.ok), results });
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
