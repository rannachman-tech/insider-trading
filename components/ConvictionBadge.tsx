interface Props {
  /** 0-100 significance score */
  value: number;
}

/**
 * Compact tier badge for leaderboard rows. Translates the 0-100 conviction
 * score into a quick visual tier: HIGH (≥70) / MED (40-69) / LOW (<40).
 *
 * Visual + verbal redundancy with the existing ConvictionBar — gives users
 * a quick read without forcing them to decode a percentage bar at a glance.
 */
export function ConvictionBadge({ value }: Props) {
  const v = Math.max(0, Math.min(100, value));
  let label: string;
  let cls: string;
  if (v >= 70) {
    label = "High";
    cls = "border-emerald/30 bg-emerald-soft text-emerald";
  } else if (v >= 40) {
    label = "Med";
    cls = "border-amber/30 bg-amber-soft text-amber";
  } else {
    label = "Low";
    cls = "border-border bg-surface-2 text-fg-muted";
  }
  return (
    <span
      className={`inline-flex items-center text-[10px] font-mono uppercase tracking-[0.12em] font-semibold px-1.5 py-0.5 rounded border ${cls} flex-shrink-0`}
      title={`Conviction score ${v}/100`}
    >
      {label}
    </span>
  );
}
