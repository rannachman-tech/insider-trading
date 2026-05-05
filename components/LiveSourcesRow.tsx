"use client";

import { useState } from "react";
import { Activity, ChevronDown, Check, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Props {
  generatedAt: string;
  sources: Array<{ name: string; ok: boolean; note?: string }>;
}

export function LiveSourcesRow({ generatedAt, sources }: Props) {
  const [open, setOpen] = useState(false);
  const allOk = sources.every((s) => s.ok);
  const updated = new Date(generatedAt);
  const time = updated.toUTCString().slice(17, 22);

  return (
    <div className="relative flex items-center gap-3 text-[11px] font-mono text-fg-subtle">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-1.5 px-2 h-6 rounded-md border border-border hover:border-border-strong transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full live-dot ${allOk ? "bg-emerald" : "bg-amber"}`} aria-hidden />
        <span className="uppercase tracking-[0.18em]">{allOk ? "Live" : "Mixed"}</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">{sources.length} feeds</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <span className="hidden md:inline tab-num">
        Updated {formatDate(generatedAt, { withYear: false })} {time} UTC
      </span>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-72 rounded-md border border-border bg-surface shadow-lg p-3 text-left">
          <div className="text-[10px] uppercase tracking-[0.18em] text-fg-subtle mb-2 font-mono">
            Data sources
          </div>
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.name} className="flex items-start gap-2 text-[12px]">
                {s.ok ? (
                  <Check className="h-3.5 w-3.5 text-emerald flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-fg font-medium font-sans">{s.name}</div>
                  {s.note && <div className="mt-0.5 text-fg-subtle text-[11px] font-sans">{s.note}</div>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-border text-[11px] text-fg-subtle font-sans leading-relaxed">
            All sources are public and free. We don't use any paid data feeds.
          </div>
        </div>
      )}
    </div>
  );
}
