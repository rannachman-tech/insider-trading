"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, Check, ExternalLink } from "lucide-react";
import { saveEtoroSession, type EtoroSession } from "@/lib/etoro-session";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: (s: EtoroSession) => void;
}

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; profile: { username: string; cid: number; env: "real" | "demo" } }
  | { kind: "error"; message: string };

export function ConnectEtoroModal({ open, onClose, onConnected }: Props) {
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [userKey, setUserKey] = useState("");
  const [test, setTest] = useState<TestState>({ kind: "idle" });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setApiKey("");
      setUserKey("");
      setTest({ kind: "idle" });
    }
  }, [open]);

  if (!open || !mounted) return null;

  async function onTest() {
    if (!apiKey.trim() || !userKey.trim()) {
      setTest({ kind: "error", message: "Both keys are required." });
      return;
    }
    setTest({ kind: "testing" });
    try {
      const res = await fetch("/api/etoro/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), userKey: userKey.trim() }),
      });
      const j = (await res.json()) as
        | { ok: true; profile: { username: string; cid: number }; detectedEnv: "real" | "demo" }
        | { ok: false; message: string };
      if (!j.ok) {
        setTest({ kind: "error", message: j.message });
        return;
      }
      setTest({
        kind: "ok",
        profile: { username: j.profile.username, cid: j.profile.cid, env: j.detectedEnv },
      });
    } catch (err) {
      setTest({ kind: "error", message: (err as Error).message });
    }
  }

  function onConnect() {
    if (test.kind !== "ok") return;
    const s: EtoroSession = {
      apiKey: apiKey.trim(),
      userKey: userKey.trim(),
      env: test.profile.env,
      username: test.profile.username,
      cid: test.profile.cid,
      connectedAt: new Date().toISOString(),
    };
    saveEtoroSession(s);
    onConnected(s);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">Connect eToro</h2>
          <button onClick={onClose} className="p-1 -m-1 text-fg-muted hover:text-fg" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-fg-muted leading-relaxed">
            Use your eToro Public API Key and Private Key. We never see your password — keys are stored only in your browser. Demo accounts work too; we'll auto-detect.
          </p>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Public API Key</label>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-border bg-bg text-sm font-mono text-fg focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald"
              placeholder="••••••••••••••••"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Private Key</label>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-border bg-bg text-sm font-mono text-fg focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald"
              placeholder="••••••••••••••••"
            />
          </div>

          <details className="text-[12px] text-fg-muted">
            <summary className="cursor-pointer hover:text-fg transition-colors">Where do I get these?</summary>
            <ol className="mt-2 space-y-1.5 leading-relaxed list-decimal list-inside">
              <li>Sign in to <a href="https://www.etoro.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald">eToro</a> with your account.</li>
              <li>Go to <span className="font-mono text-fg">Settings → Trading → Create your API key</span>.</li>
              <li>Copy both keys when shown — the Private Key only displays once and cannot be retrieved later.</li>
              <li>Paste them above and click <strong>Test connection</strong>.</li>
            </ol>
          </details>

          {test.kind === "error" && (
            <div className="flex items-start gap-2 rounded-md border border-crimson/30 bg-crimson-soft px-3 py-2 text-[13px] text-crimson">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{test.message}</span>
            </div>
          )}
          {test.kind === "ok" && (
            <div className="flex items-start gap-2 rounded-md border border-emerald/30 bg-emerald-soft px-3 py-2 text-[13px] text-emerald">
              <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Connected as <strong>@{test.profile.username}</strong> · {test.profile.env === "demo" ? "Virtual portfolio" : "Real portfolio"}
              </span>
            </div>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          {test.kind === "ok" ? (
            <button
              onClick={onConnect}
              className="px-4 py-2 rounded-md bg-emerald text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              Save and connect
            </button>
          ) : (
            <button
              onClick={onTest}
              disabled={test.kind === "testing"}
              className="px-4 py-2 rounded-md bg-fg text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {test.kind === "testing" ? "Testing..." : "Test connection"}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}
