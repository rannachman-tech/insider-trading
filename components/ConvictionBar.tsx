interface Props {
  /** 0-100 */
  value: number;
}

export function ConvictionBar({ value }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 70 ? "bg-emerald" : v >= 40 ? "bg-amber" : "bg-crimson";
  return (
    <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-label={`Conviction ${v}/100`}>
      <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${v}%` }} />
    </div>
  );
}
