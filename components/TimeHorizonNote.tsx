import { Clock } from "lucide-react";

/**
 * Single-line callout that anchors the user's expectations on signal horizon.
 * Prevents misuse — the dashboard isn't a day-trading tool.
 *
 * Lives between the title row and the hero.
 */
export function TimeHorizonNote() {
  return (
    <div className="mt-4 flex items-center gap-2 text-[12px] text-fg-subtle">
      <Clock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      <p className="leading-relaxed">
        Insider signals historically play out over <strong className="text-fg-muted font-medium">months, not days</strong>.
        Filings arrive 1–2 trading days after the trade — what you see here reflects the most recent disclosed activity, not real-time positioning.
      </p>
    </div>
  );
}
