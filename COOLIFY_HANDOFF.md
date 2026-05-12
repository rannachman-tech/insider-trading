# Insider Signal — Coolify Deployment Guide

Handoff for hosting the Insider Signal app on eToro infrastructure via Coolify. Tight checklist below — should be set up top-to-bottom without follow-up questions.

---

## Overview

The app surfaces meaningful SEC EDGAR Form 4 insider buying signals (clusters, sustained accumulation, C-suite open-market purchases) into a single-page dashboard with one-click trade execution via eToro's public API.

Two services share one persistent volume:

1. **Web app** — Next.js, serves the dashboard at `<final-domain>`
2. **Cron task** — runs daily, fetches Form 4 filings from SEC EDGAR, writes `data/insider-snapshot.json` to the shared volume

The web app reads the snapshot on every request. No rebuild when data refreshes.

---

## Repo

- **GitHub:** `https://github.com/<eToro-org>/InsiderSignal`
- **Branch:** `main`
- **Build pack:** Dockerfile (already in the repo root)
- **Stack:** Next.js 14 + TypeScript + Tailwind

---

## Service 1 — Web app

| Setting | Value |
|---|---|
| Type | Application |
| Source | `<eToro-org>/InsiderSignal`, branch `main` |
| Build pack | Dockerfile |
| Port | `3000` |
| Domain | `<final-domain>` (e.g. `insidersignal.etoro.com`) |
| Health check path | `/` |
| Memory | 512 MB |
| CPU | 0.5 vCPU |

**Persistent volume:**

| Volume name | Mount path | Notes |
|---|---|---|
| `insider-signal-data` | `/app/data` | Shared with the cron task. Persistent. Holds `insider-snapshot.json` (~5 MB JSON). |

**Environment variables:**

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<final-domain>` | Used for canonical / OG meta |
| `NODE_ENV` | `production` | |

---

## Service 2 — Scheduled task (cron)

| Setting | Value |
|---|---|
| Type | Scheduled task |
| Source | Same repo / image as the web app |
| Schedule | `0 6 * * *` (daily at 06:00 UTC — after SEC's overnight Form 4 publication window) |
| Command | `npm run fetch` |
| Working directory | `/app` |
| Timeout | 30 minutes |
| Memory | 1 GB (XML parsing for ~3-5k filings/day) |
| CPU | 0.5 vCPU |

**Mount the same volume:**

| Volume name | Mount path |
|---|---|
| `insider-signal-data` | `/app/data` |

**Environment variables:**

| Name | Value | Notes |
|---|---|---|
| `EDGAR_CONTACT` | `ranna@etoro.com` | SEC requires a contact email in the User-Agent. Hardcoded fallback exists; this override is optional. |
| `NODE_ENV` | `production` | |

No API keys needed — SEC EDGAR is fully public, no auth, no token. eToro Public API trades happen on the client side using the user's own API key stored in localStorage; the server never sees them.

---

## What Ran needs to confirm

- **Final domain.** Suggestions: `insidersignal.etoro.com`, `insiders.etoro.com`, `signal.etoro.com`.
- Coolify host can reach `https://www.sec.gov` (SEC EDGAR for Form 4 daily-index files).
- Coolify host can reach `https://api.etorostatic.com/sapi/instrumentsmetadata/V1.1/instruments` — used at runtime to resolve ticker → instrumentId when the user trades a non-catalog ticker (one-time fetch per request, cached 1h in memory).

---

## First deploy procedure

1. Create the volume `insider-signal-data` in Coolify (empty).
2. Deploy the **web app** first. The Docker entrypoint seeds the empty volume with the snapshot baked into the image at build time (60 days of real history + the latest leaderboard), so the page renders with full data immediately. Confirm `GET https://<final-domain>/` returns 200 and the leaderboard / primary signal are visible.
3. Deploy the **scheduled task**.
4. **Run the scheduled task once manually** from Coolify's UI to confirm SEC reachability + that the cron can write to the volume. Takes 3-10 minutes. After it completes, refresh the web app — same data plus today's incremental update.
5. Verify the next automatic run lands at 06:00 UTC the following day. Done.

The seed-on-first-deploy step only fires when the volume is empty — once the cron has written real data, it never reseeds. So the seeded snapshot from the image is purely a "no empty-state on day 1" convenience, not a permanent override.

---

## Health checks

- **Web:** `curl -I https://<final-domain>/` → HTTP 200.
- **Volume:** `/app/data/insider-snapshot.json` exists, has a recent `generatedAt` timestamp, `leaderboard` array non-empty.
- **Cron:** task logs show
  ```
  Ingest complete:
    Index: 48 (balanced)
    Window: 7 days
    Real buys: 87
    Real sells: 328
    Clusters: 2
    Leaderboard rows: 20
    Sectors: 9
    Filtered out: 1535
    isDemo: false
  ```

---

## Things to know

- The web app server-renders on every request (`force-dynamic`) so volume changes appear without redeploys.
- The cron is independent of the web app — restarting one doesn't affect the other.
- No database. The snapshot JSON on the volume is the only persisted state.
- If the cron ever fails, the web app keeps serving the previous successful snapshot until the next successful run.
- The cron has built-in SEC rate-limit handling (global cooldown on 429, escalating from 2min → 5min → 15min → 30min, exits after 5 consecutive 429s). Should never get throttled at the daily cadence we run.

---

## Backup / fallback path

If Coolify ever has an outage:

1. Ran can manually trigger the GitHub Actions workflow as a fallback (`Actions` → `Ingest EDGAR Form 4` → `Run workflow`).
2. That workflow runs the same `npm run fetch` and commits the refreshed snapshot back to the repo.
3. The Vercel preview deployment (kept dormant as a backup) auto-redeploys with the new data within 60s.
4. Once Coolify is back, the next scheduled cron overwrites the volume from SEC.

---

## Contact

- **Owner:** Ran Nachman — ranna@etoro.com
- **Source repo:** `<eToro-org>/InsiderSignal`
- **Approx. SLO:** best-effort. Data refreshes daily; if a refresh is missed, the previous snapshot is still served. No on-call expected.

---

## Compliance posture

The app is designed for direct eToro App Store submission:

- Footer disclaimer on every page ("Educational tool. Insider activity is a signal — not a recommendation...").
- About / methodology / source attribution all visible in-page.
- No third-party tracking, no analytics, no external scripts.
- Preferences (theme, watchlist, dismissed banners) live in localStorage only.
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, `Strict-Transport-Security: max-age=63072000`.
- User-Agent on SEC fetches includes contact email per SEC fair-use policy.
- eToro API keys never leave the user's browser — trades use a thin server route that proxies the user's keys (read from localStorage on the client) directly to `public-api.etoro.com`. The server doesn't store, log, or persist keys.
