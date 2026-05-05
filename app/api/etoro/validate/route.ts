/**
 * eToro Public API key validation — server-side, edge runtime.
 *
 * 1. GET /me with x-api-key + x-user-key + x-request-id
 * 2. Extract realCid (NOT gcid) from the response
 * 3. GET /user-info/people?cidList={realCid} → username
 * 4. Probe /trading/info/portfolio for env detection (200 = real, 401/403 = demo)
 *
 * The probe shape varies by account state — try multiple keys.
 */

export const runtime = "edge";

const ETORO_BASE = "https://public-api.etoro.com/api/v1";

interface ValidateBody {
  apiKey: string;
  userKey: string;
}

function makeRequestId(): string {
  // RFC4122 v4 — fine for an eToro x-request-id
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function headers(apiKey: string, userKey: string) {
  return {
    "x-api-key": apiKey,
    "x-user-key": userKey,
    "x-request-id": makeRequestId(),
    "content-type": "application/json",
    accept: "application/json",
  };
}

export async function POST(req: Request) {
  let body: ValidateBody;
  try {
    body = (await req.json()) as ValidateBody;
  } catch {
    return Response.json({ ok: false, message: "Bad JSON body" }, { status: 400 });
  }
  const { apiKey, userKey } = body;
  if (!apiKey || !userKey) {
    return Response.json({ ok: false, message: "Both keys are required" }, { status: 400 });
  }

  // 1. /me
  const meRes = await fetch(`${ETORO_BASE}/me`, { headers: headers(apiKey, userKey) });
  if (!meRes.ok) {
    const txt = await meRes.text().catch(() => "");
    return Response.json({
      ok: false,
      message: `Could not reach eToro (HTTP ${meRes.status}). Check your keys. ${truncate(txt, 120)}`,
    }, { status: 401 });
  }
  const me = (await meRes.json()) as { realCid?: number; gcid?: number };
  const realCid = me.realCid ?? me.gcid;
  if (!realCid) {
    return Response.json({ ok: false, message: "eToro did not return a CID for these keys" }, { status: 401 });
  }

  // 2. profile lookup
  const peopleRes = await fetch(`${ETORO_BASE}/user-info/people?cidList=${realCid}`, {
    headers: headers(apiKey, userKey),
  });
  if (!peopleRes.ok) {
    return Response.json({ ok: false, message: `Profile lookup failed: HTTP ${peopleRes.status}` }, { status: 401 });
  }
  const ppl = (await peopleRes.json()) as any;
  const profile =
    (Array.isArray(ppl) ? ppl[0] : null) ??
    ppl?.users?.[0] ??
    ppl?.people?.[0] ??
    ppl?.data?.[0] ??
    ppl?.ppl?.[0];
  const username: string | undefined =
    profile?.userName ?? profile?.username ?? profile?.userNameId ?? profile?.UserName ?? profile?.name;
  if (!username) {
    return Response.json({ ok: false, message: "Profile lookup returned no username" }, { status: 401 });
  }

  // 3. env probe
  const portfolioRes = await fetch(`${ETORO_BASE}/trading/info/portfolio`, {
    headers: headers(apiKey, userKey),
  });
  const detectedEnv: "real" | "demo" =
    portfolioRes.ok ? "real" : portfolioRes.status === 401 || portfolioRes.status === 403 ? "demo" : "real";

  return Response.json({
    ok: true,
    profile: { username, cid: realCid },
    detectedEnv,
  });
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
