import { AlertCircle } from "lucide-react";

/**
 * "What NOT to do with this data" — explicit retail-protection panel.
 *
 * Four most common misreads, each progressively disclosed: the bold
 * lead-in is always visible; the full explanation lives in a native
 * <details> so the dashboard doesn't compete with 4 paragraphs of
 * caution text on every visit.
 */
const CAUTIONS: Array<{ headline: string; body: string }> = [
  {
    headline: "Selling is a much weaker signal than buying.",
    body: "Insiders sell for diversification, taxes, divorce, mortgages, college tuition — most sales tell you almost nothing about the company. We've already filtered out scheduled plans, but even the remaining sells should not trigger you to sell yours.",
  },
  {
    headline: "A single trade is not a thesis.",
    body: "One CEO buying their own stock once is a data point. A pattern of multiple insiders buying together over weeks is a signal. Don't act on a single row.",
  },
  {
    headline: "Form 4s arrive with delay.",
    body: "Insiders have up to two business days to file. The price you'd pay today is not the price the insider paid on the trade date.",
  },
  {
    headline: "Past performance does not guarantee future returns.",
    body: "Academic research finds insider buying tends to predict above-market returns over 6–12 months — but that's an average across thousands of trades, not a guarantee for any one name.",
  },
];

export function ReadingCautions() {
  return (
    <section className="rounded-lg border border-border bg-surface-2 px-5 py-4 h-full">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-amber mt-0.5 flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-fg">How not to read this dashboard</h3>
          <ul className="mt-2.5 space-y-1.5">
            {CAUTIONS.map((c, i) => (
              <li key={i}>
                <details className="group">
                  <summary className="cursor-pointer text-[12.5px] text-fg leading-relaxed select-none flex items-start gap-1.5">
                    <span className="flex-shrink-0 mt-1 w-1 h-1 rounded-full bg-fg-subtle group-open:bg-amber transition-colors" aria-hidden />
                    <span>
                      <strong className="font-medium">{c.headline}</strong>
                      <span className="ml-1.5 text-[11px] text-fg-subtle group-open:hidden">tap to expand</span>
                    </span>
                  </summary>
                  <p className="mt-1 ml-3 text-[12px] text-fg-muted leading-relaxed">
                    {c.body}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
