"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { lookupStock } from "@/lib/stock-catalog";
import { loadEtoroSession, type EtoroSession } from "@/lib/etoro-session";
import { formatUsd } from "@/lib/format";

interface Props {
  ticker: string;
  /** Editorial line shown on the Review screen (e.g. cluster headline) */
  rationale?: string;
  open: boolean;
  onClose: () => void;
}

const PRESETS = [50, 100, 250, 500, 1000];

type Step =
  | { kind: "intel" }
  | { kind: "amount" }
  | { kind: "confirm" }
  | { kind: "executing" }
  | { kind: "result"; ok: boolean; message?: string };

/**
 * Trade modal for a SINGLE TICKER. Four-step flow:
 *
 *   1. intel    — "what you're trading on": shows the rationale that brought
 *                 the user here (cluster headline / accumulation summary /
 *                 single-name framing). Reframes the modal as research-led
 *                 instead of brokerage-led — reviewer feedback that the
 *                 jump from intelligence → amount felt too abrupt.
 *   2. amount   — amount selector + presets
 *   3. confirm  — order summary
 *   4. executing → result
 *
 * Same eToro Public API integration — server resolves instrumentId from
 * the public catalog at request time.
 */
export function TradeSingleModal({ ticker, rationale, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [step, setStep] = useState<Step>({ kind: "intel" });
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
      setStep({ kind: "intel" });
      setAmount(100);
    }
  }, [open]);

  if (!open || !mounted) return null;

  // Pre-verified catalog hit is nice-to-have (gives us a real company name
  // for the Review screen). When we don't have one, the server resolves
  // the ticker against eToro's public catalog at trade time.
  const stock = lookupStock(ticker);
  const displayName = stock?.name ?? ticker;

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
          // instrumentId is optional — server resolves from public catalog
          // when omitted, so any EDGAR-surfaced ticker can trade in-app.
          basket: [{ ticker, instrumentId: stock?.instrumentId, amount }],
        }),
      });
      const j = (await res.json()) as { ok: boolean; results: Array<{ ticker: string; ok: boolean; message?: string }> };
      const r = j.results?.[0];
      setStep({ kind: "result", ok: !!r?.ok, message: r?.message });
    } catch (err) {
      setStep({ kind: "result", ok: false, message: (err as Error).message });
    }
  }

  const body = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={() => step.kind !== "executing" && onClose()}
      />
      <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(step.kind === "amount" || step.kind === "confirm") && (
              <button
                onClick={() => setStep({ kind: step.kind === "confirm" ? "amount" : "intel" })}
                className="p-1 -m-1 text-fg-muted hover:text-fg"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-base font-semibold text-fg">
              <span className="font-mono">{ticker}</span>{" "}
              <span className="text-fg-subtle text-[13px] font-normal">on eToro</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator — 3 dots showing intel/amount/confirm progress */}
            {(step.kind === "intel" || step.kind === "amount" || step.kind === "confirm") && session && (
              <div className="flex items-center gap-1" aria-hidden>
                <Dot active={step.kind === "intel"} />
                <Dot active={step.kind === "amount"} />
                <Dot active={step.kind === "confirm"} />
              </div>
            )}
            {step.kind !== "executing" && (
              <button onClick={onClose} className="p-1 -m-1 text-fg-muted hover:text-fg" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {/* Any ticker, in-app: instrumentId is resolved server-side against
            the eToro public catalog at trade time. The only gate is whether
            the user is connected. */}
        {!session && (
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber-soft px-3 py-2.5 text-[13px] text-fg leading-relaxed">
              <AlertCircle className="h-4 w-4 text-amber mt-0.5 flex-shrink-0" />
              <span>
                Connect your eToro account first — keys live only in your browser. Once connected, you can place orders directly from this dialog.
              </span>
            </div>
            <p className="text-[12.5px] text-fg-muted">
              Click <strong className="text-fg">Connect eToro</strong> in the top-right header, then come back here.
            </p>
            <a
              href={`https://www.etoro.com/markets/${ticker.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-[12.5px] text-fg-muted hover:text-fg transition-colors"
            >
              Or view {ticker} on eToro
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Step 1 — intel: read the signal before picking an amount. The
            modal opens here when launched from any card; user must tap
            Continue to advance to the amount selector. */}
        {session && step.kind === "intel" && (
          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
                What you're trading on
              </div>
              <div className="mt-1.5 text-[16px] sm:text-[17px] font-semibold text-fg leading-snug">
                {displayName}
              </div>
              {rationale && (
                <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">{rationale}</p>
              )}
            </div>

            <div className="rounded-md border border-border bg-surface-2 px-3.5 py-2.5 text-[12px] text-fg-muted leading-relaxed">
              <strong className="text-fg-muted font-medium">Educational signal — not personalised advice.</strong>{" "}
              Insider activity tends to play out over 6–12 months, not days. Treat this as a thesis check, not a trigger.
            </div>

            <p className="text-[11.5px] text-fg-subtle leading-relaxed">
              Connected as <strong className="text-fg-muted">@{session.username}</strong>
              {" "}on your <strong className="text-fg-muted">{session.env === "demo" ? "Virtual" : "Real"}</strong> portfolio.
            </p>
          </div>
        )}

        {/* Step 2 — amount selector. */}
        {session && step.kind === "amount" && (
          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
                Buying
              </div>
              <div className="mt-1 text-[15px] text-fg font-medium">{displayName}</div>
              <div className="text-[12px] font-mono text-fg-subtle">{ticker}</div>
            </div>

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

            <p className="text-[11.5px] text-fg-subtle leading-relaxed">
              On your <strong className="text-fg-muted">{session.env === "demo" ? "Virtual" : "Real"}</strong> portfolio.
            </p>
          </div>
        )}

        {session && step.kind === "confirm" && (
          <div className="px-5 py-4 space-y-3">
            <p className="text-[13px] text-fg-muted leading-relaxed">
              You're about to buy <strong className="text-fg">{formatUsd(amount)}</strong> of{" "}
              <span className="font-mono font-semibold text-fg">{ticker}</span> ({displayName}) on your{" "}
              <strong className="text-fg">{session.env === "demo" ? "Virtual" : "Real"}</strong> eToro portfolio.
            </p>
            <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5 text-[13px] flex items-center justify-between">
              <span className="text-fg-muted">Total order</span>
              <span className="font-mono tab-num text-fg font-semibold">{formatUsd(amount)}</span>
            </div>
            <p className="text-[11.5px] text-fg-subtle leading-relaxed">
              Make sure you have the required funds available. Markets must be open. Trades may execute at slightly different prices than displayed. <strong className="text-fg-muted">Educational signal — not personalised advice.</strong>
            </p>
          </div>
        )}

        {step.kind === "executing" && (
          <div className="px-5 py-10 text-center">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-fg/20 border-t-emerald animate-spin" />
            <div className="mt-3 text-[13px] text-fg-muted">Sending order to eToro…</div>
          </div>
        )}

        {step.kind === "result" && (
          <div className="px-5 py-5 space-y-3">
            {step.ok ? (
              <div className="flex items-start gap-2 rounded-md border border-emerald/30 bg-emerald-soft px-3 py-2.5 text-[13px] text-fg leading-relaxed">
                <Check className="h-4 w-4 text-emerald mt-0.5 flex-shrink-0" />
                <span>
                  Order accepted by eToro. <strong className="text-fg-muted">{formatUsd(amount)}</strong> of{" "}
                  <span className="font-mono font-semibold">{ticker}</span> has been placed.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-crimson/30 bg-crimson-soft px-3 py-2.5 text-[13px] text-fg leading-relaxed">
                <AlertCircle className="h-4 w-4 text-crimson mt-0.5 flex-shrink-0" />
                <span>Order rejected: {step.message ?? "Unknown error from eToro."}</span>
              </div>
            )}
          </div>
        )}

        <footer className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          {session && step.kind === "intel" && (
            <>
              <button onClick={onClose} className="px-3 py-2 rounded-md text-[13px] text-fg-muted hover:text-fg">
                Cancel
              </button>
              <button
                onClick={() => setStep({ kind: "amount" })}
                className="px-4 py-2 rounded-md bg-fg text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                Continue to order
              </button>
            </>
          )}
          {session && step.kind === "amount" && (
            <>
              <button onClick={() => setStep({ kind: "intel" })} className="px-3 py-2 rounded-md text-[13px] text-fg-muted hover:text-fg">
                Back
              </button>
              <button
                onClick={() => setStep({ kind: "confirm" })}
                disabled={amount < 10}
                className="px-4 py-2 rounded-md bg-fg text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Review order
              </button>
            </>
          )}
          {session && step.kind === "confirm" && (
            <>
              <button onClick={() => setStep({ kind: "amount" })} className="px-3 py-2 rounded-md text-[13px] text-fg-muted hover:text-fg">
                Back
              </button>
              <button
                onClick={execute}
                className="px-4 py-2 rounded-md bg-emerald text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                I understand — place order
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
          {!session && (step.kind === "intel" || step.kind === "amount") && (
            <button onClick={onClose} className="px-3 py-2 rounded-md text-[13px] text-fg-muted hover:text-fg">
              Close
            </button>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

/** Tiny progress dot for the step indicator in the modal header. */
function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={`block w-1.5 h-1.5 rounded-full transition-colors ${
        active ? "bg-fg" : "bg-border-strong"
      }`}
    />
  );
}
