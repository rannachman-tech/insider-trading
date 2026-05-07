import type { Phase } from "./types";

/**
 * Map an Insider Conviction Index reading (0-100) to one of three phases.
 *
 * Boundaries:
 *   ≥70  → strong-buying      (broad-based insider conviction)
 *   40–70 → mixed              (no directional message)
 *   <40  → cautious            (insiders net-selling)
 *
 * Phase keys remain "heavy-buying" / "balanced" / "heavy-selling" for API
 * compatibility, but every user-facing label uses the softer wording below.
 */
export function phaseFor(index: number): Phase {
  if (!Number.isFinite(index)) return "balanced";
  const clamped = Math.max(0, Math.min(100, index));
  if (clamped >= 70) return "heavy-buying";
  if (clamped >= 40) return "balanced";
  return "heavy-selling";
}

export const PHASE_LABEL: Record<Phase, string> = {
  "heavy-buying": "Strong insider buying",
  balanced: "Mixed signal",
  "heavy-selling": "Insider caution",
};

export const PHASE_LABEL_COMPACT: Record<Phase, string> = {
  "heavy-buying": "Strong buying",
  balanced: "Mixed",
  "heavy-selling": "Cautious",
};

export const PHASE_HEADLINE: Record<Phase, string> = {
  "heavy-buying": "Yes — broadly.",
  balanced: "Mixed signal.",
  "heavy-selling": "More are selling than buying.",
};

export const PHASE_VERDICT: Record<Phase, string> = {
  "heavy-buying":
    "Multiple executives are spending personal cash on their own companies' stock this week. When CEOs and CFOs reach for their own wallets together, academic research finds it tends to precede above-average returns over the following 6–12 months — though not in any single trade and not without exceptions.",
  balanced:
    "Insider buying and selling roughly cancel out this week. Treat any individual filing as one data point — not a trigger. Use it to confirm or question a thesis you already have for a specific name, not to drive a market-wide call.",
  "heavy-selling":
    "More insiders are selling than buying this week. Some context matters: most insider sales are diversification, taxes or pre-arranged plans rather than a view on the company. We've already filtered out pre-scheduled trades, but even so, this kind of reading historically corresponds to slightly weaker forward returns — not crashes.",
};

export const PHASE_PLAYBOOK: Record<Phase, string> = {
  "heavy-buying":
    "If you're already considering names that show up below, today's tape gives you company. Multi-insider clusters are the strongest historical signal — start there.",
  balanced:
    "Treat insider activity as confirmation, not a trigger. If you have a thesis for a specific name, the data here helps you check whether insiders agree.",
  "heavy-selling":
    "Don't panic-sell on this reading alone. Apply more scrutiny to names where the CEO or CFO is the one selling — that's the slice that historically carries the most signal.",
};

export const PHASE_TONE: Record<Phase, "positive" | "neutral" | "negative"> = {
  "heavy-buying": "positive",
  balanced: "neutral",
  "heavy-selling": "negative",
};
