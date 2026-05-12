"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { PHASE_HEADLINE, PHASE_PLAYBOOK } from "@/lib/phase";
import { Tooltip } from "./Tooltip";

interface Props {
  snapshot: InsiderSnapshot;
  className?: string;
}

const PhaseIcon = ({ phase }: { phase: string }) => {
  const cls = "h-4 w-4";
  if (phase === "heavy-buying") return <TrendingUp className={`${cls} text-emerald`} />;
  if (phase === "heavy-selling") return <TrendingDown className={`${cls} text-crimson`} />;
  return <Minus className={`${cls} text-amber`} />;
};

/**
 * "The read" card — the 28px headline + key counts + posture cue.
 *
 * The headline is intentionally dynamic for the balanced phase: when the
 * index says ~mixed but there's positive cluster + CEO/CFO activity,
 * "Mixed signal." undersells what the user is seeing. The reconciliation
 * subline names the two competing forces explicitly so the user
 * understands why the number isn't more decisive.
 */
export function InsightsCard({ snapshot, className = "" }: Props) {
  if (!snapshot) {
    return (
      <section className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
        <h2 className="text-sm font-medium text-fg-muted">Reading the tape...</h2>
        <p className="mt-2 text-sm text-fg-subtle">Insights resume after the next ingest.</p>
      </section>
    );
  }

  const ceoCfoBuys = snapshot.leaderboard.filter(
    (r) => r.role === "CEO" || r.role === "CFO"
  ).length;
  const headline = dynamicHeadline(snapshot, ceoCfoBuys);
  const reconciliation = reconciliationLine(snapshot, ceoCfoBuys);
  const playbook = PHASE_PLAYBOOK[snapshot.phase];

  return (
    <section className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
      <div className="flex items-center gap-2">
        <PhaseIcon phase={snapshot.phase} />
        <h2 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
          The read
        </h2>
      </div>
      <p className="mt-3 text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight text-fg">
        {headline}
      </p>
      {reconciliation && (
        <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">
          {reconciliation}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle flex items-center gap-1">
            <Tooltip
              label="Cluster buys"
              hint="3 or more different insiders buying the same company within 30 days. Academic research finds this is the strongest insider signal."
            />
            <span className="text-fg-subtle">(30d)</span>
          </div>
          <div className="mt-1 text-[28px] font-mono tab-num font-semibold text-fg leading-none">
            {snapshot.clusterCount}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Insider buyers (7d)</div>
          <div className="mt-1 text-[28px] font-mono tab-num font-semibold text-fg leading-none">
            {snapshot.buyCount}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">What this means for you</div>
        <p className="mt-1.5 text-sm text-fg-muted leading-relaxed">{playbook}</p>
      </div>
    </section>
  );
}

/**
 * Choose the right headline for today's reading. The hard case is "balanced
 * with positive cluster/CEO activity" — the index says mixed but the
 * leaderboard reads constructive. We name that out loud.
 */
function dynamicHeadline(s: InsiderSnapshot, ceoCfoBuys: number): string {
  if (s.phase === "heavy-buying") return PHASE_HEADLINE["heavy-buying"];
  if (s.phase === "heavy-selling") return PHASE_HEADLINE["heavy-selling"];
  // balanced
  if (s.clusterCount >= 1 && ceoCfoBuys >= 1) return "Constructive, but not decisive.";
  if (s.clusterCount >= 1) return "Mixed — with a constructive footnote.";
  if (ceoCfoBuys >= 2) return "Mixed — but the C-suite is buying.";
  return PHASE_HEADLINE.balanced; // "Mixed signal."
}

/**
 * One-sentence reconciliation of the two competing forces driving today's
 * reading. Only shown when there's genuine cross-current to explain
 * (cluster/CEO activity offset by broad selling, or vice versa).
 */
function reconciliationLine(s: InsiderSnapshot, ceoCfoBuys: number): string | null {
  const sellHeavy = s.sellCount > s.buyCount * 1.5;
  const cashFlowNegative = s.buyDollars > 0 && s.sellDollars > s.buyDollars * 1.2;

  if (s.phase === "balanced" && s.clusterCount >= 1 && sellHeavy) {
    return `Cluster activity and C-suite buying lifted the score, but broader market-wide selling kept the index near neutral. Read the leaderboard, not the headline number.`;
  }
  if (s.phase === "balanced" && ceoCfoBuys >= 1 && cashFlowNegative) {
    return `${ceoCfoBuys} C-suite officer${ceoCfoBuys === 1 ? "" : "s"} bought, but the dollar weight of sales is still larger — most of those sales are filtered diversification, so the leaderboard is where conviction shows up.`;
  }
  if (s.phase === "heavy-buying" && s.clusterCount === 0) {
    return `Broad buying without a multi-insider cluster — directional, but lighter than a true conviction tape.`;
  }
  if (s.phase === "heavy-selling" && ceoCfoBuys >= 1) {
    return `Insider selling dominates the tape, but ${ceoCfoBuys} C-suite buy${ceoCfoBuys === 1 ? "" : "s"} cuts against it — those single names deserve closer reading.`;
  }
  return null;
}
