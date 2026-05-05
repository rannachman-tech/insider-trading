import { Info } from "lucide-react";

export function RiskBanner() {
  return (
    <div className="bg-surface-2 border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-start gap-2 text-[11px] leading-relaxed text-fg-subtle">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden />
          <p>
            Educational tool. Insider activity is a signal — not a recommendation. Trading involves risk; you may lose money.
            Past insider purchases do not predict future returns. Not personalised investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}
