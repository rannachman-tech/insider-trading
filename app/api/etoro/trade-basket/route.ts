/**
 * Execute a basket trade via eToro Public API.
 *
 * Body shape:
 *   { apiKey, userKey, env: "real"|"demo", basket: [{ ticker, instrumentId, amount }] }
 *
 * Posts to /trading/execution/{demo/}market-open-orders/by-amount with
 * PascalCase body — gotcha #12 in the skill reference.
 */

export const runtime = "edge";

const ETORO_BASE = "https://public-api.etoro.com/api/v1";

interface BasketTrade {
  apiKey: string;
  userKey: string;
  env: "real" | "demo";
  basket: Array<{ ticker: string; instrumentId: number; amount: number }>;
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

  for (const h of basket) {
    if (h.amount < 1) {
      results.push({ ticker: h.ticker, ok: false, message: "Amount below $1" });
      continue;
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: hdrs(apiKey, userKey),
        body: JSON.stringify({
          InstrumentID: h.instrumentId,
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
