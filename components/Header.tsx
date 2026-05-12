"use client";

import { useEffect, useState } from "react";
import { Radar, Sun, Moon } from "lucide-react";
import { ConnectEtoroBadge } from "./ConnectEtoroBadge";

export function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initial = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("iac-theme", next); } catch {}
  };

  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="grid place-items-center w-8 h-8 rounded-md bg-fg text-bg group-hover:bg-emerald group-hover:text-white transition-colors">
              <Radar className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight text-fg">
                Insider Signal
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
                Are insiders buying their own stock?
              </div>
            </div>
          </a>

          <div className="flex items-center gap-2">
            <ConnectEtoroBadge />
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid place-items-center w-9 h-9 rounded-md border border-border hover:border-border-strong text-fg-muted hover:text-fg transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
