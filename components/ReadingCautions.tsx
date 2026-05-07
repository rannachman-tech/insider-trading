import { AlertCircle } from "lucide-react";

/**
 * "What NOT to do with this data" — explicit retail-protection panel.
 *
 * The reviewer's #11 critique: retail users overreact to insider selling.
 * This callout names the four most common ways to misread the dashboard
 * and pre-empts the panic-sell instinct.
 *
 * Sits below the cluster-buys section, above the leaderboard.
 */
export function ReadingCautions() {
  return (
    <section className="rounded-lg border border-amber/25 bg-amber-soft px-5 py-4">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-amber mt-0.5 flex-shrink-0" aria-hidden />
        <div>
          <h3 className="text-[13px] font-semibold text-fg">How not to read this dashboard</h3>
          <ul className="mt-2.5 space-y-2 text-[12.5px] text-fg-muted leading-relaxed">
            <li>
              <strong className="text-fg font-medium">Selling is a much weaker signal than buying.</strong>{" "}
              Insiders sell for diversification, taxes, divorce, mortgages, college tuition — most sales tell you almost nothing about the company. We've already filtered out scheduled plans, but even the remaining sells should not trigger you to sell yours.
            </li>
            <li>
              <strong className="text-fg font-medium">A single trade is not a thesis.</strong>{" "}
              One CEO buying their own stock once is a data point. A pattern of multiple insiders buying together over weeks is a signal. Don't act on a single row.
            </li>
            <li>
              <strong className="text-fg font-medium">Form 4s arrive with delay.</strong>{" "}
              Insiders have up to two business days to file. The price you'd pay today is not the price the insider paid on the trade date.
            </li>
            <li>
              <strong className="text-fg font-medium">Past performance does not guarantee future returns.</strong>{" "}
              Academic research finds insider buying tends to predict above-market returns over 6–12 months — but that's an average across thousands of trades, not a guarantee for any one name.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
