"use client";

import { useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";

interface Props {
  /** What the user sees (the term being explained) */
  label: ReactNode;
  /** The plain-English explanation */
  hint: string;
}

/**
 * Lightweight inline tooltip — wraps a term with an info icon. Hover to read
 * the explanation. The whole purpose is to swap "Code-P" jargon for plain
 * words while still letting the curious user dig in.
 */
export function Tooltip({ label, hint }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="inline-flex items-center gap-1 relative cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <span className="border-b border-dotted border-fg-subtle">{label}</span>
      <HelpCircle className="h-3 w-3 text-fg-subtle" aria-hidden />
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 rounded-md bg-fg text-bg text-[12px] leading-relaxed shadow-lg pointer-events-none"
          style={{ maxWidth: "260px" }}
        >
          {hint}
        </span>
      )}
    </span>
  );
}
