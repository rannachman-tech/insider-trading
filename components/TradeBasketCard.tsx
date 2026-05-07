"use client";

import { useState } from "react";
import { ArrowUpRight, Briefcase } from "lucide-react";
import type { Phase, InsiderSnapshot } from "@/lib/types";
import { basketFor } from "@/lib/baskets";
import { TradeBasketModal } from "./TradeBasketModal";

interface Props {
  snapshot: InsiderSnapshot;
  className?: string;
}

const PHASE_PILL: Record<Phase, string> = {
  "heavy-buying": "bg-emerald-soft text-emerald border-emerald/20",
  balanced: "bg-amber-soft text-amber border-amber/20",
  "heavy-selling": "bg-crimson-soft text-crimson border-crimson/20",
};

const PHASE_PILL_LABEL: Record<Phase, string> = {
  "heavy-buying": "Strong buying",
  balanced: "Mixed signal",
  "heavy-selling": "Cautious regime",
};

export function TradeBasketCard({ snapshot, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const basket = basketFor(snapshot);
  const phase = snapshot.phase;

  return (
    <>
      <section className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-fg-muted" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
            Educational allocation
          </span>
          <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded border ${PHASE_PILL[phase]}`}>
            {PHASE_PILL_LABEL[phase]}
          </span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-fg">{basket.title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{basket.thesis}</p>
        {basket.sourceNote && (
          <p className="mt-1.5 text-[11px] font-mono text-fg-subtle">{basket.sourceNote}</p>
        )}

        <ul className="mt-3 grid grid-cols-2 gap-1.5">
          {basket.holdings.map((h) => (
            <li
              key={h.ticker}
              className="flex items-center justify-between rounded border border-border bg-surface-2 px-2 py-1.5 text-[12px]"
              title={h.shortRationale}
            >
              <span className="font-mono font-semibold text-fg">{h.ticker}</span>
              <span className="font-mono tab-num text-fg-subtle">{h.weight}%</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => setOpen(true)}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-fg text-bg px-4 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          Explore this allocation on eToro
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <p className="mt-2 text-[10.5px] text-fg-subtle leading-relaxed text-center">
          Educational illustration. Not personalised advice. You decide whether and how much to allocate.
        </p>
      </section>

      <TradeBasketModal snapshot={snapshot} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
