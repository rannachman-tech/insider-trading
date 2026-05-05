# Insiders Activity Compass

> Are insiders buying their own stock?

A live read on what corporate insiders are doing with personal cash — drawn from SEC EDGAR Form 4 filings, filtered for real conviction, and ranked.

Part of the eToro Compass family (Recession Compass, Stock Cycle Compass, BondSpace, etc.).

## What it is

A single-page Next.js app that turns the firehose of Form 4 filings into one number, one leaderboard, and one cluster-buy lens — three views of the same question.

The headline number is the **Insider Conviction Index (0-100)** — a blend of:

- 55% net Code-P dollar flow (open-market personal-cash buys vs sells)
- 25% buyer-vs-seller insider count
- 20% number of cluster buys (3+ distinct insiders, same company, 30 days)

The product's editorial discipline filters away the noise: Code M (option exercise), F (tax withholding), A (grant), and 10b5-1 scheduled sales are all excluded by default. Only Code-P, non-10b5-1, ≥$25k transactions earn the leaderboard.

## What's in the box

```
app/                    Next.js 14 app router pages + API routes
  api/etoro/validate    eToro Public API key validation (edge runtime)
  api/etoro/trade-basket  Basket trade execution
components/             Hero, leaderboard, clusters, sectors, modals
lib/                    Domain types, EDGAR parser, snapshot builder, baskets
scripts/                Ingest, seed, verify, simulate
data/                   Built snapshot JSON committed by CI
.github/workflows/      Verify on PR, ingest daily at 23:00 UTC
```

## Stack

Next.js 14 + TypeScript + Tailwind 3, Geist Sans/Mono, lucide-react, custom SVG centerpiece.
Total monthly cost: $0 (Vercel Hobby + GitHub Actions free tier + free SEC EDGAR + free eToro public catalog).

## Local dev

```bash
npm install
npm run seed              # build a demo snapshot from seed data
npm run dev               # start the dev server at http://localhost:3000
```

## Useful scripts

```bash
npm run typecheck         # tsc --noEmit
npm run build             # next build
npm run seed              # rebuild data/insider-snapshot.json from seed
npm run ingest            # rebuild from live SEC EDGAR Form 4 feed
npm run verify:baskets    # confirm every basket instrumentId resolves on eToro
npm run simulate:baskets  # 9-section invariants + edge cases
```

## Citizenship chrome (mandatory)

- Risk warning banner at top
- Connect eToro CTA in header + contextual on hero
- Demo-mode pill when synthetic data is in play
- Live source health row
- "Not financial advice" disclaimer in footer
- No PII / cookies / fingerprinting
- ESC + scroll-lock + portal mounting on every modal (sticky-header backdrop-blur creates containing block, see Compass gotcha #4)

## Deploy

```bash
git push          # Vercel auto-deploys
```

The daily ingest workflow regenerates `data/insider-snapshot.json` and commits it. Vercel rebuilds with the fresh data on push.

## License

Internal eToro app. Not for redistribution.
