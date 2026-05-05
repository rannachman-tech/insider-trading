"use client";

import { Filter } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { formatNum } from "@/lib/format";

interface Props {
  filtered: InsiderSnapshot["filtered"];
  buyCount: number;
  sellCount: number;
}

/**
 * Filter transparency strip — shows what we excluded from the headline numbers.
 * Important for retail trust: "you're seeing 22 real buys, not the 150-row
 * EDGAR firehose, here's what got filtered and why."
 *
 * Lives below the leaderboard, right above the cluster-buys section.
 */
export function FilterTransparency({ filtered, buyCount, sellCount }: Props) {
  const totalFiltered =
    filtered.grantsAndAwards +
    filtered.optionExercises +
    filtered.taxWithholding +
    filtered.preScheduledSales +
    filtered.belowThreshold;
  const totalShown = buyCount + sellCount;
  if (totalFiltered === 0) return null;

  const items: Array<{ label: string; count: number; why: string }> = [
    {
      label: "Stock grants & RSU vests",
      count: filtered.grantsAndAwards,
      why: "Compensation, not conviction",
    },
    {
      label: "Option exercises",
      count: filtered.optionExercises,
      why: "Cash-out moves, not new buying",
    },
    {
      label: "Pre-scheduled sales",
      count: filtered.preScheduledSales,
      why: "Set months ahead — no timing signal",
    },
    {
      label: "Tax-withholding sales",
      count: filtered.taxWithholding,
      why: "Triggered automatically by RSU vests",
    },
    {
      label: "Below $25,000",
      count: filtered.belowThreshold,
      why: "Too small to matter",
    },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface-2 px-5 py-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="h-4 w-4 text-fg-muted" aria-hidden />
          <h3 className="text-[13px] font-semibold text-fg">
            Why our numbers are smaller than raw EDGAR
          </h3>
        </div>
        <p className="text-[12.5px] text-fg-muted leading-relaxed flex-1 min-w-[16rem]">
          We start with the raw filings stream and filter to the slice that historically carries signal. This week:{" "}
          <strong className="text-fg font-mono tab-num">{totalShown}</strong>{" "}
          {totalShown === 1 ? "real trade" : "real trades"} shown,{" "}
          <strong className="text-fg font-mono tab-num">{formatNum(totalFiltered)}</strong>{" "}
          filtered out:
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-2">
        {items.map((it) => (
          <li
            key={it.label}
            className="rounded-md border border-border bg-surface px-3 py-2"
            title={it.why}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-fg-muted truncate">{it.label}</span>
              <span className="font-mono tab-num text-[14px] font-semibold text-fg-subtle">
                −{it.count}
              </span>
            </div>
            <div className="mt-0.5 text-[10.5px] text-fg-subtle leading-tight">{it.why}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
