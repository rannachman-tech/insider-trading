# Insider Signal

> Are insiders buying their own stock?

A live read on what corporate insiders are doing with personal cash — drawn from SEC EDGAR Form 4 filings, filtered for real conviction, and ranked into actionable signal objects (clusters, sustained accumulation, C-suite buys).

An eToro App Store product.

## What it is

A single-page Next.js app that turns the firehose of Form 4 filings into one number, one leaderboard, and a Primary Signal of the day — three views of the same question.

The headline number is the **Insider Conviction Index (0-100)** — a blend of:

- 30% net Code-P dollar flow (open-market personal-cash buys vs sells, capped at $5M per transaction so one founder block doesn't dominate)
- 30% cluster buys (3+ distinct insiders, same company, 30 days)
- 20% role-weighted CEO/CFO buy intensity
- 20% buyer-vs-seller insider count (breadth)

The product's editorial discipline filters away the noise: Code M (option exercise), F (tax withholding), A (grant), and 10b5-1 scheduled sales are all excluded by default. Only Code-P, non-10b5-1, ≥$25k transactions earn the leaderboard.

Two signal types are surfaced as distinct objects:

- **Cluster** — 3+ distinct insiders buying the same name in 30 days. Strongest documented insider signal (Cohen, Malloy & Pomorski 2012).
- **Sustained accumulation** — 1 insider buying ≥5 times or ≥$5M in ≤10 days. Second-strongest type (Lakonishok & Lee 2001 on buying intensity).

## What's in the box

```
app/                    Next.js 14 app router pages + API routes
  api/etoro/validate    eToro Public API key validation (edge runtime)
  api/etoro/trade-basket  In-app trade execution — server-side instrumentId
                          resolution against eToro's public catalog
components/             Hero (ConvictionMeter), leaderboard, primary signal,
                        drawer, sectors, modals, retention banner
lib/                    Domain types, EDGAR parser, snapshot builder,
                        ticker-level aggregation, stock catalog
scripts/                Live ingest, historical backfill, dedup, verify
data/                   Built snapshot JSON committed by CI
.github/workflows/      Verify on PR, ingest daily
```

## Stack

Next.js 14 + TypeScript + Tailwind 3, Geist Sans/Mono, lucide-react, custom SVG visualizations.

Hosting plan:
- **Preview**: Vercel Hobby (free)
- **Production**: Coolify on eToro infra at `*.etoro.com` (see `COOLIFY_HANDOFF.md`)

Total monthly cost: $0 (free SEC EDGAR + free eToro public catalog + free hosting).

## Local dev

```bash
npm install
npm run ingest             # pull a fresh snapshot from SEC EDGAR
npm run dev                # start the dev server at http://localhost:3000
```

## Useful scripts

```bash
npm run typecheck          # tsc --noEmit
npm run build              # next build
npm run ingest             # rebuild data/insider-snapshot.json from live EDGAR
npm run fetch              # alias for ingest — used by the Coolify scheduled task
npm run backfill           # walk 60+ weekdays of EDGAR for historical index series
npm run verify:baskets     # confirm every basket instrumentId resolves on eToro
npm run simulate:baskets   # 9-section invariants + edge cases
```

## Citizenship chrome (mandatory)

- Risk warning banner at top
- Connect eToro CTA in header + contextual on hero
- Live source health row
- "Not financial advice" disclaimer in footer
- No analytics / no PII / no third-party scripts
- localStorage-only preferences (theme, dismissed banners, last-visit memo)
- ESC + scroll-lock + portal mounting on every modal (sticky-header backdrop-blur creates a containing block — every modal portal-mounts to `document.body` to escape it)

## Deploy

### Preview (Vercel)

```bash
git push                   # Vercel auto-deploys
```

### Production (Coolify on eToro infra)

See `COOLIFY_HANDOFF.md` and `MIGRATION.md` for the full migration plan from this personal repo to the eToro org GitHub and Coolify deployment.

The daily ingest runs as a Coolify scheduled task (`npm run fetch`, daily 06:00 UTC) that writes `data/insider-snapshot.json` to a shared volume. The web app reads the volume on every request — no rebuild needed when data refreshes.

## License

Internal eToro app. Not for redistribution.
