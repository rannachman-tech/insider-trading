/** Format a USD dollar amount for compact display: $1.2M, $14.7M, $310k. */
export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Format a percentage with sign and 1 decimal: +12.4%, -3.1%. */
export function formatPct(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

/** Format a number with thousand separators. */
export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US");
}

/** Convert ISO date → "May 4" / "Apr 12, 2025". */
export function formatDate(iso: string, opts?: { withYear?: boolean }): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  if (opts?.withYear) return `${month} ${day}, ${d.getUTCFullYear()}`;
  return `${month} ${day}`;
}

/** Days between an ISO date and now. */
export function daysAgo(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}
