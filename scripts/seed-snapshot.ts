/**
 * REMOVED. Seed snapshots are no longer supported anywhere in the build.
 * The page reads only from `data/insider-snapshot.json` produced by the
 * live EDGAR ingest, and falls back to an empty state if that file is missing.
 *
 * If you're trying to populate `data/insider-snapshot.json` for local UI
 * work, run: `npm run ingest`.
 */

console.error("scripts/seed-snapshot.ts has been removed. Run `npm run ingest`.");
process.exit(2);
