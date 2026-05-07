import { Lightbulb } from "lucide-react";

/**
 * "Why insider buying matters" — the emotional/intuition side of the
 * product that retail users need before the dashboard's data clicks
 * for them. Sits as a companion to ReadingCautions: one explains what
 * NOT to do, this explains why anyone should care at all.
 */
export function WhyItMatters() {
  return (
    <section className="rounded-lg border border-border bg-surface-2 px-5 py-4 h-full">
      <div className="flex items-start gap-2.5">
        <Lightbulb className="h-4 w-4 text-emerald mt-0.5 flex-shrink-0" aria-hidden />
        <div>
          <h3 className="text-[13px] font-semibold text-fg">Why insider buying matters</h3>
          <p className="mt-2 text-[12.5px] text-fg-muted leading-relaxed">
            Executives and directors already have most of their net worth and career exposed to the company they run — through stock grants, salary, options and reputation. Reaching for personal cash to buy <em>more</em> of their own company's stock on top of that is unusual. They're concentrating risk further when most rational diversification advice would say not to.
          </p>
          <p className="mt-2 text-[12.5px] text-fg-muted leading-relaxed">
            That's why open-market insider purchases — especially when several insiders do it together — have been studied for decades. The signal isn't that insiders know secret information; it's that they're voluntarily increasing exposure to something they already know more about than the market does.
          </p>
        </div>
      </div>
    </section>
  );
}
