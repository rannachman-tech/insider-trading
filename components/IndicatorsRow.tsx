import type { IndicatorTile } from "@/lib/types";

interface Props {
  indicators: IndicatorTile[];
}

const TONE_RING: Record<string, string> = {
  positive: "ring-1 ring-emerald/25",
  warning: "ring-1 ring-amber/25",
  negative: "ring-1 ring-crimson/25",
  neutral: "ring-1 ring-border",
};

const TONE_DOT: Record<string, string> = {
  positive: "bg-emerald",
  warning: "bg-amber",
  negative: "bg-crimson",
  neutral: "bg-fg-subtle",
};

export function IndicatorsRow({ indicators }: Props) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {indicators.map((ind) => (
        <article
          key={ind.label}
          className={`rounded-lg border border-border bg-surface p-4 ${TONE_RING[ind.tone ?? "neutral"]}`}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${TONE_DOT[ind.tone ?? "neutral"]}`} aria-hidden />
            {ind.label}
          </div>
          <div className="mt-2 text-[22px] sm:text-[24px] font-mono tab-num font-semibold text-fg leading-none">
            {ind.value}
          </div>
          {ind.sub && (
            <div className="mt-1.5 text-[12px] text-fg-subtle truncate">{ind.sub}</div>
          )}
        </article>
      ))}
    </section>
  );
}
