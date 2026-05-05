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
    "Company executives are spending their own money to buy stock in their own companies — and they're doing it together. When a CEO and CFO both reach for personal cash to buy what they already work for, it tends to be a meaningful signal.",
  balanced:
    "Insider buying and selling roughly cancel out this week. There's no clear directional message from inside the boardroom right now. Treat any individual buy as one data point, not a trigger to act.",
  "heavy-selling":
    "More insiders are selling than buying — and not just on pre-scheduled plans. When the people who run companies trim their personal stakes, it's usually about diversification, but it's worth watching where the selling is concentrated.",
};

export const PHASE_PLAYBOOK: Record<Phase, string> = {
  "heavy-buying":
    "If you're already considering names that show up below, today's tape gives you company. Cluster buys (multiple insiders, same name) are the strongest signal — start there.",
  balanced:
    "Don't read insider activity as a standalone buy or sell signal this week. Use it to confirm or question a thesis you already have for a specific name.",
  "heavy-selling":
    "Be more cautious about names where the CEO or CFO is selling. This isn't a panic signal — most insider sales are routine — but the burden of proof on bullish theses is higher.",
};

export const PHASE_TONE: Record<Phase, "positive" | "neutral" | "negative"> = {
  "heavy-buying": "positive",
  balanced: "neutral",
  "heavy-selling": "negative",
};
