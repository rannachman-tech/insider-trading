"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface Props {
  items: InsiderSnapshot["recentActivity"];
}

const fmtUsdShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Math.round(n)}`;
};

/**
 * Compact activity strip — fills the empty space below the dial. Six most
 * recent significant filings, newest first. Buys in emerald, sells in
 * crimson. Density-first design: each row is one line, mono ticker + role
 * pill + dollar amount + relative date.
 */
export function RecentActivity({ items }: Props) {
  if (!items.length) return null;
  return (
    <div className="mt-4 w-full max-w-[440px]">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-fg-subtle font-mono mb-1.5">
        <span>Latest filings</span>
        <span>buy / sell</span>
      </div>
      <ul className="rounded-md border border-border overflow-hidden divide-y divide-border bg-surface-2">
        {items.map((it, i) => (
          <li
            key={`${it.ticker}-${it.insiderName}-${i}`}
            className="flex items-center gap-2 px-2.5 py-1.5 text-[12px]"
          >
            {it.isBuy ? (
              <ArrowUpRight className="h-3 w-3 text-emerald flex-shrink-0" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-crimson flex-shrink-0" aria-hidden />
            )}
            <span className="font-mono font-semibold text-fg w-12 truncate">{it.ticker}</span>
            <span className="text-[10px] font-mono text-fg-subtle uppercase tracking-[0.1em] w-7">
              {it.role === "10%Owner" ? "10%" : it.role.slice(0, 4)}
            </span>
            <span className="text-fg-muted truncate flex-1 min-w-0">{shortName(it.insiderName)}</span>
            <span
              className={`font-mono tab-num font-medium whitespace-nowrap ${it.isBuy ? "text-emerald" : "text-crimson"}`}
            >
              {it.isBuy ? "+" : "−"}{fmtUsdShort(it.dollars)}
            </span>
            <span className="font-mono text-[10px] text-fg-subtle whitespace-nowrap w-12 text-right">
              {formatDate(it.transactionDate)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortName(name: string): string {
  // "Robins Jason D" → "J. Robins" — last,first → first-initial last
  const parts = name.split(" ");
  if (parts.length < 2) return name;
  // EDGAR uses LAST FIRST [MIDDLE], surface as "F. LAST"
  const last = parts[0];
  const first = parts[1];
  return `${first[0]}. ${last}`;
}
