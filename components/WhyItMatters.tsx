import { Lightbulb } from "lucide-react";

/**
 * "Why insider buying matters" — the emotional/intuition side of the
 * product that retail users need before the dashboard's data clicks
 * for them.
 *
 * Default state shows just the headline + a one-line summary. Full
 * explanation lives behind a native <details> so the page stays light
 * for returning users while still being available for first-timers.
 */
export function WhyItMatters() {
  return (
    <section className="rounded-lg border border-border bg-surface-2 px-5 py-4 h-full">
      <div className="flex items-start gap-2.5">
        <Lightbulb className="h-4 w-4 text-emerald mt-0.5 flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-fg">Why insider buying matters</h3>
          <p className="mt-1.5 text-[12.5px] text-fg-muted leading-relaxed">
            Insiders spending personal cash to buy <em>more</em> of their own stock is a voluntary concentration of risk — and that's what makes it interesting.
          </p>
          <details className="mt-2 group">
            <summary className="cursor-pointer text-[11.5px] text-fg-subtle hover:text-fg-muted select-none">
              <span className="group-open:hidden">Read more</span>
              <span className="hidden group-open:inline">Hide details</span>
            </summary>
            <div className="mt-2 space-y-2 text-[12.5px] text-fg-muted leading-relaxed">
              <p>
                Executives and directors already have most of their net worth and career exposed to the company they run — through stock grants, salary, options and reputation. Reaching for personal cash to buy more on top of that is unusual. They're concentrating risk further when most rational diversification advice would say not to.
              </p>
              <p>
                That's why open-market insider purchases — especially when several insiders do it together — have been studied for decades. The signal isn't that insiders know secret information; it's that they're voluntarily increasing exposure to something they already know more about than the market does.
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
