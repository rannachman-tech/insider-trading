# Insiders Activity Compass — Migration to eToro Org + Coolify

Goal: move from `github.com/rannachman-tech/insider-trading` (personal, public)
to `github.com/<eToro-org>/InsidersActivityCompass` (corporate, private), then
deploy to `*.etoro.com` via Coolify.

Today (post-migration prep): the app is ready. Dockerfile, .dockerignore,
runtime data loading, security headers, and a `npm run fetch` cron alias are
all in place. Pushed to `rannachman-tech/insider-trading@main`.

---

## Phase 1 — Migrate the GitHub repo

### Step 1. Import to the eToro org

1. Go to GitHub → **+** (top-right) → **Import a repository**.
2. Source URL: `https://github.com/rannachman-tech/insider-trading`
3. Owner: pick the eToro org from the dropdown (e.g. `eToro-AI-Foundry`).
4. New repo name: **`InsidersActivityCompass`** (PascalCase, matches the
   Daily Digest convention).
5. Visibility: **Private**.
6. Click **Begin import**. Takes 30-90 seconds.

You'll have a fresh repo with the full git history. The personal repo
stays untouched as a backup.

### Step 2. Re-add Actions secrets

Actions secrets don't migrate. In the new repo:

Settings → Secrets and variables → Actions → **New repository secret**.

Add:

| Name | Value | Purpose |
|---|---|---|
| `EDGAR_CONTACT` | `ranna@etoro.com` | User-Agent string SEC requires for EDGAR fetches |

(Add any others you have — Vercel didn't need any, just the contact.)

### Step 3. Configure Actions permissions

Settings → Actions → General:

- **Actions permissions:** *"Allow all actions and reusable workflows"*
- **Workflow permissions:** *"Read and write permissions"* (the daily
  ingest commits the refreshed `data/insider-snapshot.json` back to the repo).
- Save.

### Step 4. Trigger the workflow manually

Actions tab → **Ingest EDGAR Form 4** → **Run workflow** → main.

This confirms:
- Secrets are loaded.
- The bot has push permission.
- SEC reachable from GitHub's runners.

If the run succeeds, the daily scheduled trigger activates within 30-120
minutes. (Brand-new private org repos sometimes have a delay before
scheduled triggers wake up — this is a known GitHub thing, not a bug.)

### Step 5. Archive the old repo (after Phase 2 lands)

Once Coolify is verified working on the new repo, archive
`rannachman-tech/insider-trading`:

- Old repo → Settings → bottom of page → **Archive this repository**.

This keeps it read-only as a backup. Don't delete — the original GH
Actions history is useful provenance.

---

## Phase 2 — Deploy to Coolify

The repo is already Coolify-ready:

- `Dockerfile` at the root — Node 20 alpine, builds Next.js, runs `npm start`.
- `.dockerignore` — excludes node_modules, .next, the 200MB backfill cache.
- `app/page.tsx` uses `force-dynamic` + `revalidate=0` so volume updates
  appear without rebuilds.
- `package.json` has a `npm run fetch` alias for the cron command.
- Security headers wired in `next.config.js`.

### What the eToro infra owner does

Hand them `COOLIFY_HANDOFF.md` (in this same repo) — it has the exact
service config, env vars, volume mount, and first-deploy procedure.

Two things they'll need from you:

1. **Final domain confirmation.** Suggestions:
   `compass.etoro.com`, `insiders.etoro.com`, `signal.etoro.com`.
2. **Confirmation** the Coolify host can reach
   `https://www.sec.gov/Archives/edgar/daily-index/` — that's where the
   cron pulls Form 4 filings from. No auth, no rate-limit issues at the
   pace we run (~3 req/sec, well below SEC's 10 req/sec ceiling).

### First-deploy procedure

(Owner does this, you watch the logs.)

1. Create volume `compass-data` (empty).
2. Deploy the web app. It boots, shows the empty state — no snapshot yet.
3. Confirm `https://<final-domain>` returns 200.
4. Deploy the scheduled task.
5. **Manually trigger the task once** from Coolify's UI. Takes 3-10 minutes
   for the first SEC EDGAR walk.
6. Refresh the web app — leaderboard, cluster, primary signal all render.
7. Verify the next automatic run lands at the scheduled time (e.g. 06:00 UTC).

### After Coolify is live

- Switch the GitHub Actions cron to **manual-only** (workflow_dispatch only)
  as a fallback. Coolify is the primary scheduler from now on.
- Pause or delete the Vercel project. `insider-trading-sigma.vercel.app`
  stops resolving when you do, so check no docs reference it first.
- Update the README to point at the production URL.

---

## Phase 3 — App Store submission (optional, after Coolify is live)

When you're ready to list on the eToro App Store:

- One-pager: product overview, value prop, screenshots.
- Submission form copy: app name, tagline, short + long description.
- Screenshots: 3 desktop, 3 mobile, light + dark mix. Take in a real
  browser, not a sandbox.
- App icon: 192×192 and 512×512 PNG.
- Compliance review: disclaimer footer, no analytics, no third-party
  scripts, security headers — all already in place.

I have skill templates for the one-pager and submission form when you're
ready.

---

## Rollback path

If Coolify deployment hits a snag and you need to revert:

1. Re-enable the Vercel project (or redeploy it).
2. Re-enable the daily scheduled GitHub Actions trigger.
3. Point your DNS / docs back at `insider-trading-sigma.vercel.app`.

Total reverse-out time: ~10 minutes. The git history is preserved on
both repos, so nothing is lost.
