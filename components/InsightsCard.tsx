"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { PHASE_PLAYBOOK } from "@/lib/phase";

interface Props {
  snapshot: InsiderSnapshot;
  className?: string;
}

const PHASE_HEADLINE: Record<string, string> = {
  "heavy-buying": "Insiders are buying.",
  balanced: "Mixed signal — read carefully.",
  "heavy-selling": "Insiders are net-selling.",
};

const PhaseIcon = ({ phase }: { phase: string }) => {
  const cls = "h-4 w-4";
  if (phase === "heavy-buying") return <TrendingUp className={`${cls} text-emerald`} />;
  if (phase === "heavy-selling") return <TrendingDown className={`${cls} text-crimson`} />;
  return <Minus className={`${cls} text-amber`} />;
};

export function InsightsCard({ snapshot, className = "" }: Props) {
  if (!snapshot) {
    return (
      <section className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
        <h2 className="text-sm font-medium text-fg-muted">Reading the tape...</h2>
        <p className="mt-2 text-sm text-fg-subtle">Insights resume after the next ingest.</p>
      </section>
    );
  }

  const headline = PHASE_HEADLINE[snapshot.phase];
  const playbook = PHASE_PLAYBOOK[snapshot.phase];

  return (
    <section className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
      <div className="flex items-center gap-2">
        <PhaseIcon phase={snapshot.phase} />
        <h2 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
          The read
        </h2>
      </div>
      <p className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight leading-tight text-fg">
        {headline}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
        {snapshot.verdict}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-border">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Cluster buys (30d)</div>
          <div className="mt-1 text-2xl font-mono tab-num font-semibold text-fg">
            {snapshot.clusterCount}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Code-P buyers</div>
          <div className="mt-1 text-2xl font-mono tab-num font-semibold text-fg">
            {snapshot.buyCount}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Playbook</div>
        <p className="mt-1.5 text-sm text-fg-muted leading-relaxed">{playbook}</p>
      </div>
    </section>
  );
}
