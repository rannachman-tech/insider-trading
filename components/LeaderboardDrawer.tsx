"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";
import { formatUsd, formatPct, formatDate, formatNum } from "@/lib/format";

interface Props {
  row: LeaderboardRow | null;
  onClose: () => void;
}

export function LeaderboardDrawer({ row, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [row, onClose]);

  if (!row || !mounted) return null;

  const sumShares = row.transactions.reduce((s, t) => s + t.shares, 0);
  const avgPrice = sumShares > 0 ? row.dollars / sumShares : row.avgPricePerShare;
  const note = noteFor(row);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-surface border border-border sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-fg">{row.ticker}</span>
              <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">{row.sector}</span>
            </div>
            <div className="mt-0.5 text-[14px] text-fg-muted truncate">{row.company}</div>
          </div>
          <button onClick={onClose} className="p-1 -m-1 text-fg-muted hover:text-fg" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-5">
          {note && (
            <div className="rounded-md border border-emerald/30 bg-emerald-soft px-3.5 py-2.5 text-[13px] text-fg leading-relaxed">
              {note}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Conviction"
              value={`${row.significance} / 100`}
              sub="dollars × role × stake"
              mono
            />
            <Stat label="Total spent" value={formatUsd(row.dollars)} mono />
            <Stat label="Shares bought" value={formatNum(row.shares)} mono />
            <Stat label="Average price" value={`$${avgPrice.toFixed(2)}`} mono />
            <Stat
              label="Holding increased"
              value={`+${Math.abs(row.stakePctChange).toFixed(1)}%`}
              sub="vs prior holding"
              mono
            />
            <Stat
              label="Now owns"
              value={formatNum(row.transactions[row.transactions.length - 1]?.sharesOwnedAfter ?? 0)}
              sub="shares post-trade"
              mono
            />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              The insider
            </div>
            <div className="mt-1.5 text-[15px] font-medium text-fg">{row.insiderName}</div>
            <div className="text-[12px] text-fg-muted">{row.officerTitle ?? row.role}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
              Filings ({row.transactions.length})
            </div>
            <ul className="space-y-2">
              {row.transactions.map((t) => (
                <li key={t.accession} className="flex items-center justify-between gap-3 text-[13px] py-1.5 border-b border-border last:border-0">
                  <span className="text-fg-muted">{formatDate(t.transactionDate, { withYear: true })}</span>
                  <span className="font-mono tab-num text-fg">{formatNum(t.shares)} sh @ ${t.pricePerShare.toFixed(2)}</span>
                  <span className="font-mono tab-num text-fg font-medium">{formatUsd(t.dollars)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-border">
            <a
              href={`https://www.etoro.com/markets/${row.ticker.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-fg text-bg px-4 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              View {row.ticker} on eToro
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-2 text-[11px] text-fg-subtle text-center">
              Trading stocks involves risk. Make sure you have funds available.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">{label}</div>
      <div className={`mt-1 text-[15px] font-semibold text-fg ${mono ? "font-mono tab-num" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-fg-subtle mt-0.5">{sub}</div>}
    </div>
  );
}

/** Plain-English context line — one sentence, role + size + stake. */
function noteFor(row: LeaderboardRow): string | null {
  const parts: string[] = [];
  if (row.role === "CEO" || row.role === "CFO") {
    parts.push(`${row.role} buying their own company's stock`);
  }
  if (row.dollars >= 1_000_000) {
    parts.push(`${formatUsd(row.dollars)} of personal cash deployed`);
  }
  if (row.stakePctChange >= 5) {
    parts.push(`${formatPct(row.stakePctChange)} increase to existing stake`);
  }
  if (!parts.length) return null;
  return parts.join(" — ") + ".";
}
