import type { Phase } from "./types";

/**
 * Map an Insider Conviction Index reading (0-100) to one of three phases.
 *
 * Boundaries follow the spec in compass-starter-prompts:
 *   ≥70  → heavy-buying  (insiders loading, mirror cluster buys)
 *   40–70 → balanced     (use as confirmation only)
 *   <40  → heavy-selling (de-risking, watch for sector tops)
 */
export function phaseFor(index: number): Phase {
  if (!Number.isFinite(index)) return "balanced";
  const clamped = Math.max(0, Math.min(100, index));
  if (clamped >= 70) return "heavy-buying";
  if (clamped >= 40) return "balanced";
  return "heavy-selling";
}

export const PHASE_LABEL: Record<Phase, string> = {
  "heavy-buying": "Heavy buying",
  balanced: "Balanced",
  "heavy-selling": "Heavy selling",
};

export const PHASE_VERDICT: Record<Phase, string> = {
  "heavy-buying":
    "Insiders are putting personal cash into their own companies. Cluster buys lead the tape — historically a constructive setup.",
  balanced:
    "Mixed signal. Buying and selling roughly cancel out. Use insider activity as confirmation only, not as a standalone trigger.",
  "heavy-selling":
    "Insiders are net-selling — many are 10b5-1 scheduled, but conviction buying is light. Watch for sector tops and trim where C-suite is exiting.",
};

export const PHASE_PLAYBOOK: Record<Phase, string> = {
  "heavy-buying":
    "Mirror the strongest cluster buys: 3+ distinct insiders, CEO/CFO weighted, real cash purchases (Code P only).",
  balanced:
    "Lean on quality and cluster-buy filtering. Don't fade insiders, but don't lead with them either.",
  "heavy-selling":
    "Trim positions where C-suite is selling outside 10b5-1 plans. Defensive overlays earn their cost here.",
};

export const PHASE_TONE: Record<Phase, "positive" | "neutral" | "negative"> = {
  "heavy-buying": "positive",
  balanced: "neutral",
  "heavy-selling": "negative",
};
