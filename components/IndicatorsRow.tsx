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

const TONE_VALUE: Record<string, string> = {
  positive: "text-emerald",
  warning: "text-fg",
  negative: "text-crimson",
  neutral: "text-fg",
};

// Retail-friendly label rewrites — replaces analyst jargon if it shows up.
const LABEL_REWRITE: Record<string, string> = {
  "Cluster buys (30d)": "Group buys this month",
  "Net buy/sell ($)": "Net dollars going in",
  "Top conviction (this week)": "Biggest single buy",
  "Sector tilt": "Hottest sector",
};

export function IndicatorsRow({ indicators }: Props) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {indicators.map((ind) => {
        const label = LABEL_REWRITE[ind.label] ?? ind.label;
        return (
          <article
            key={ind.label}
            className={`rounded-lg border border-border bg-surface px-4 py-3.5 ${TONE_RING[ind.tone ?? "neutral"]}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-mono text-fg-subtle leading-tight">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${TONE_DOT[ind.tone ?? "neutral"]}`} aria-hidden />
              <span className="truncate">{label}</span>
            </div>
            <div className={`mt-2 text-[24px] sm:text-[28px] font-mono tab-num font-semibold leading-none truncate ${TONE_VALUE[ind.tone ?? "neutral"]}`}>
              {ind.value}
            </div>
            {ind.sub && (
              <div className="mt-1.5 text-[12px] text-fg-subtle truncate">{ind.sub}</div>
            )}
          </article>
        );
      })}
    </section>
  );
}
