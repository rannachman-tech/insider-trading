/**
 * DEPRECATED — use `npm run ingest` (scripts/ingest-live.mjs) instead.
 *
 * The original TS ingest script had two problems we found in production:
 *   1. It used the EDGAR atom feed, which is capped at 100 entries and is
 *      mostly noise (424B2 prospectuses, 497J amendments) — yielding ~0
 *      Form 4 transactions on most runs.
 *   2. When transactions came back too sparse, it FELL BACK TO SEED DATA
 *      and committed it as if it were live. That's how the deployed page
 *      ended up showing Huang Jen-Hsun + Jason Robins seed names.
 *
 * The replacement (scripts/ingest-live.mjs) walks the daily-index files
 * directly, giving ~10,000 Form 4 filings per 5-day window with no seed
 * fallback. This file is kept only to fail loudly if anything still
 * references it.
 */

console.error(
  "scripts/ingest-edgar.ts is DEPRECATED. Run `npm run ingest` (uses scripts/ingest-live.mjs)."
);
process.exit(2);
