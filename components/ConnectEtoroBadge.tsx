"use client";

import { useEffect, useState } from "react";
import { LinkIcon, Check } from "lucide-react";
import { loadEtoroSession, clearEtoroSession, ETORO_EVENT, type EtoroSession } from "@/lib/etoro-session";
import { ConnectEtoroModal } from "./ConnectEtoroModal";

export function ConnectEtoroBadge() {
  const [session, setSession] = useState<EtoroSession | null>(null);
  const [open, setOpen] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);

  useEffect(() => {
    setSession(loadEtoroSession());
    const onChange = () => setSession(loadEtoroSession());
    window.addEventListener(ETORO_EVENT, onChange);
    return () => window.removeEventListener(ETORO_EVENT, onChange);
  }, []);

  if (session) {
    return (
      <>
        <button
          onClick={() => setShowDisconnect((s) => !s)}
          className="relative inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-emerald/30 bg-emerald-soft text-emerald text-[12px] font-medium hover:bg-emerald-soft/80 transition-colors"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald live-dot" />
          @{session.username}
          {session.env === "demo" && (
            <span className="text-[9px] uppercase tracking-[0.18em] font-mono px-1 py-0.5 rounded bg-amber/20 text-amber border border-amber/30">
              Virtual
            </span>
          )}
        </button>
        {showDisconnect && (
          <div className="absolute right-4 top-12 z-40 rounded-md border border-border bg-surface shadow-lg px-3 py-2 text-[12px]">
            <div className="text-fg-subtle">Connected as @{session.username}</div>
            <button
              onClick={() => {
                clearEtoroSession();
                setShowDisconnect(false);
              }}
              className="mt-1 text-crimson hover:underline"
            >
              Disconnect
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-fg text-bg text-[12px] font-semibold hover:opacity-90 transition-opacity"
      >
        <LinkIcon className="h-3.5 w-3.5" />
        Connect eToro
      </button>
      <ConnectEtoroModal open={open} onClose={() => setOpen(false)} onConnected={(s) => setSession(s)} />
    </>
  );
}
