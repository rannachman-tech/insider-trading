/**
 * REMOVED. Seed data has been deleted from the build to ensure the page
 * only ever displays real EDGAR-sourced filings.
 *
 * If `data/insider-snapshot.json` is missing or malformed, the page renders
 * the "No snapshot yet" empty state defined in `app/page.tsx`.
 *
 * The live ingest lives at `scripts/ingest-live.mjs` and is invoked by
 * `npm run ingest` (and by the GitHub Actions workflow daily at 23:00 UTC).
 */

export {};
