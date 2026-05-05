"use client";

import { Activity } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Props {
  generatedAt: string;
  sources: Array<{ name: string; ok: boolean; note?: string }>;
}

export function LiveSourcesRow({ generatedAt, sources }: Props) {
  const allOk = sources.every((s) => s.ok);
  const updated = new Date(generatedAt);
  const time = updated.toUTCString().slice(17, 22);

  return (
    <div className="flex items-center gap-3 text-[11px] font-mono text-fg-subtle">
      <span className="hidden sm:inline">
        {sources.length} source{sources.length === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-full live-dot ${allOk ? "bg-emerald" : "bg-amber"}`} aria-hidden />
        <span className="uppercase tracking-[0.18em]">{allOk ? "Live" : "Mixed"}</span>
      </div>
      <span className="hidden md:inline">·</span>
      <span className="hidden md:inline tab-num">
        Updated {formatDate(generatedAt, { withYear: false })} {time} UTC
      </span>
    </div>
  );
}
