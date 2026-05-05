"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { basketFor, allocate } from "@/lib/baskets";
import { loadEtoroSession, type EtoroSession } from "@/lib/etoro-session";
import { formatUsd } from "@/lib/format";
import type { Phase } from "@/lib/types";

interface Props {
  phase: Phase;
  open: boolean;
  onClose: () => void;
}

const PRESETS = [100, 250, 500, 1000, 2500];

type Step =
  | { kind: "review" }
  | { kind: "confirm" }
  | { kind: "executing" }
  | { kind: "result"; results: Array<{ ticker: string; ok: boolean; message?: string }> };

export function TradeBasketModal({ phase, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [step, setStep] = useState<Step>({ kind: "review" });
  const [session, setSession] = useState<EtoroSession | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setSession(loadEtoroSession());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step.kind !== "executing") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, step]);

  useEffect(() => {
    if (!open) {
      setStep({ kind: "review" });
      setAmount(500);
    }
  }, [open]);

  if (!open || !mounted) return null;

  const basket = basketFor(phase);
  const allocs = allocate(basket, amount);

  async function execute() {
    if (!session) return;
    setStep({ kind: "executing" });
    try {
      const res = await fetch("/api/etoro/trade-basket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: session.apiKey,
          userKey: session.userKey,
          env: session.env,
          basket: allocs.map((a) => ({
            ticker: a.ticker,
            instrumentId: a.instrumentId,
            amount: a.dollars,
          })),
        }),
      });
      const j = (await res.json()) as { ok: boolean; results: Array<{ ticker: string; ok: boolean; message?: string }> };
      setStep({ kind: "result", results: j.results });
    } catch (err) {
      setStep({
        kind: "result",
        results: allocs.map((a) => ({ ticker: a.ticker, ok: false, message: (err as Error).message })),
      });
    }
  }

  const body = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => step.kind !== "executing" && onClose()} />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step.kind === "confirm" && (
              <button onClick={() => setStep({ kind: "review" })} className="p-1 -m-1 text-fg-muted hover:text-fg">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-base font-semibold text-fg">{basket.title}</h2>
          </div>
          {step.kind !== "executing" && (
            <button onClick={onClose} className="p-1 -m-1 text-fg-muted hover:text-fg" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        {!session && (
          <div className="m-5 rounded-md border border-amber/30 bg-amber-soft px-3 py-2.5 text-[13px] text-fg leading-relaxed flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber mt-0.5 flex-shrink-0" />
            <span>Connect eToro from the header first to execute this basket. You can still review the allocation below.</span>
          </div>
        )}

        {step.kind === "review" && (
          <div className="px-5 py-4 space-y-4">
            <p className="text-[13px] text-fg-muted leading-relaxed">{basket.thesis}</p>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Amount (USD)</div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-mono tab-num border transition-colors ${
                      amount === p
                        ? "bg-fg text-bg border-fg"
                        : "border-border text-fg-muted hover:border-border-strong"
                    }`}
                  >
                    ${p}
                  </button>
                ))}
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))}
                  className="px-3 py-1.5 rounded-md border border-border bg-bg text-[12px] font-mono tab-num w-24 focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">Allocation</div>
              <ul className="rounded-md border border-border overflow-hidden divide-y divide-border">
                {allocs.map((a) => (
                  <li key={a.ticker} className="px-3 py-2 flex items-center justify-between bg-surface-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-mono font-medium text-fg">{a.ticker}</div>
                      <div className="text-[11px] text-fg-subtle truncate">{a.shortRationale}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tab-num text-[13px] font-semibold text-fg">{formatUsd(a.dollars)}</div>
                      <div className="text-[10px] font-mono tab-num text-fg-subtle">{a.weight}%</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {step.kind === "confirm" && (
          <div className="px-5 py-4 space-y-3">
            <p className="text-[13px] text-fg-muted leading-relaxed">
              You're about to execute the <strong>{basket.title}</strong> basket for <strong>{formatUsd(amount)}</strong>{" "}
              {session && (
                <>
                  on your <strong>{session.env === "demo" ? "Virtual" : "Real"}</strong> portfolio (@{session.username}).
                </>
              )}
            </p>
            <ul className="rounded-md border border-border overflow-hidden divide-y divide-border">
              {allocs.map((a) => (
                <li key={a.ticker} className="px-3 py-2 flex items-center justify-between bg-surface-2 text-[13px]">
                  <span className="font-mono font-medium text-fg">{a.ticker}</span>
                  <span className="font-mono tab-num text-fg">{formatUsd(a.dollars)}</span>
                </li>
              ))}
              <li className="px-3 py-2 flex items-center justify-between bg-surface text-[13px] font-semibold">
                <span className="text-fg-muted">Total</span>
                <span className="font-mono tab-num text-fg">{formatUsd(amount)}</span>
              </li>
            </ul>
            <p className="text-[12px] text-fg-subtle leading-relaxed">
              Make sure you have the required funds available in your account. Trades may execute at slightly different prices than displayed. Markets must be open for individual stock orders.
            </p>
          </div>
        )}

        {step.kind === "executing" && (
          <div className="px-5 py-10 text-center">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-fg/20 border-t-emerald animate-spin" />
            <div className="mt-3 text-[13px] text-fg-muted">Sending orders to eToro...</div>
          </div>
        )}

        {step.kind === "result" && (
          <div className="px-5 py-4 space-y-3">
            <div className="text-[13px] text-fg-muted">
              {step.results.every((r) => r.ok) ? "All orders accepted." : "Some orders failed. Review below."}
            </div>
            <ul className="rounded-md border border-border overflow-hidden divide-y divide-border text-[13px]">
              {step.results.map((r) => (
                <li key={r.ticker} className="px-3 py-2 flex items-center justify-between bg-surface-2">
                  <span className="font-mono font-medium text-fg">{r.ticker}</span>
                  <span className={r.ok ? "text-emerald flex items-center gap-1" : "text-crimson flex items-center gap-1"}>
                    {r.ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {r.ok ? "Accepted" : r.message ?? "Rejected"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <footer className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          {step.kind === "review" && (
            <>
              <button onClick={onClose} className="px-3 py-2 rounded-md text-[13px] text-fg-muted hover:text-fg">
                Cancel
              </button>
              <button
                onClick={() => setStep({ kind: "confirm" })}
                disabled={!session || amount < 10}
                className="px-4 py-2 rounded-md bg-fg text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {session ? "Continue" : "Connect eToro to continue"}
              </button>
            </>
          )}
          {step.kind === "confirm" && (
            <>
              <button onClick={() => setStep({ kind: "review" })} className="px-3 py-2 rounded-md text-[13px] text-fg-muted hover:text-fg">
                Back
              </button>
              <button
                onClick={execute}
                className="px-4 py-2 rounded-md bg-emerald text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                Execute on eToro
              </button>
            </>
          )}
          {step.kind === "result" && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-fg text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
