"use client";

import { Users, ArrowUpRight } from "lucide-react";
import type { ClusterBuy } from "@/lib/types";
import { formatUsd, formatDate } from "@/lib/format";
import { ConvictionBar } from "./ConvictionBar";

interface Props {
  clusters: ClusterBuy[];
}

export function ClusterBuys({ clusters }: Props) {
  if (!clusters.length) {
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-fg flex items-center gap-2">
          <Users className="h-4 w-4 text-fg-muted" /> Cluster buys
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          No 3+ insider clusters in the last 30 days. Cluster buying is the strongest documented insider signal — when it returns, this section lights up.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface overflow-hidden">
      <header className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald" /> Cluster buys
            <span className="ml-1 text-[10px] uppercase tracking-[0.18em] font-mono text-emerald bg-emerald-soft px-1.5 py-0.5 rounded">
              the strongest signal
            </span>
          </h2>
        </div>
        <p className="mt-1 text-[12px] text-fg-subtle leading-relaxed">
          3+ distinct insiders buying the same company within 30 days, with personal cash. Academic research (Cohen-Malloy-Pomorski 2012) finds the cleanest abnormal return signal in this exact pattern.
        </p>
      </header>

      <div className="divide-y divide-border">
        {clusters.map((c) => (
          <article key={c.ticker} className="px-5 py-4 hover:bg-surface-2 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base font-semibold text-fg">{c.ticker}</span>
                  <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
                    {c.sector}
                  </span>
                  <span className="text-[10px] font-medium text-emerald bg-emerald-soft border border-emerald/20 px-1.5 py-0.5 rounded">
                    {c.insiderCount} insiders
                  </span>
                </div>
                <div className="mt-0.5 text-[13px] text-fg-muted truncate">{c.company}</div>
              </div>
              <div className="text-right">
                <div className="font-mono tab-num text-base font-semibold text-fg">
                  {formatUsd(c.totalDollars)}
                </div>
                <div className="text-[11px] font-mono tab-num text-fg-subtle">
                  thru {formatDate(c.latestDate)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <ConvictionBar value={c.strength} />
              <span className="text-[11px] font-mono tab-num text-fg-subtle whitespace-nowrap">
                strength {c.strength}
              </span>
            </div>

            <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {c.insiders.slice(0, 6).map((i, idx) => (
                <li key={idx} className="flex items-center justify-between text-[12px]">
                  <span className="text-fg truncate min-w-0 mr-2">
                    <span className="font-medium">{i.name}</span>
                    <span className="text-fg-subtle"> · {i.role}</span>
                  </span>
                  <span className="font-mono tab-num text-fg-muted whitespace-nowrap">
                    {formatUsd(i.dollars)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-end">
              <a
                href={`https://www.etoro.com/markets/${c.ticker.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-fg-muted hover:text-emerald transition-colors"
              >
                View {c.ticker} on eToro
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
