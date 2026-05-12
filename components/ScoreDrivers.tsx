"use client";

import type { InsiderSnapshot } from "@/lib/types";

interface Props {
  snapshot: InsiderSnapshot;
}

/**
 * Compact 4-pill driver strip directly under the dial. Surfaces the live
 * contributions of each weighted signal so the user gets first-paint
 * explainability without expanding the full score breakdown.
 *
 * Pill colour codes the contribution direction:
 *   emerald = pushing score up
 *   crimson = pushing score down
 *   muted   = ~zero contribution
 */
export function ScoreDrivers({ snapshot }: Props) {
  const totalDollars = snapshot.buyDollars + snapshot.sellDollars;
  const dollarSig = totalDollars > 0 ? (snapshot.buyDollars - snapshot.sellDollars) / totalDollars : 0;
  const totalCount = snapshot.buyCount + snapshot.sellCount;
  const countSig = totalCount > 0 ? (snapshot.buyCount - snapshot.sellCount) / totalCount : 0;
  const clusterSig = Math.min(1, snapshot.clusterCount / 10);
  const roleIntensity = snapshot.leaderboard
    .filter((r) => r.role === "CEO" || r.role === "CFO")
    .reduce((s, r) => s + r.significance, 0);
  const roleSig = Math.min(1, roleIntensity / 400);

  const dollarContrib = Math.round(dollarSig * 0.30 * 50);
  const clusterContrib = Math.round(clusterSig * 0.30 * 50);
  const roleContrib = Math.round(roleSig * 0.20 * 50);
  const countContrib = Math.round(countSig * 0.20 * 50);

  const pills = [
    { label: "Net flow", value: dollarContrib, max: 15 },
    { label: "Clusters", value: clusterContrib, max: 15, positiveOnly: true },
    { label: "CEO/CFO buys", value: roleContrib, max: 10, positiveOnly: true },
    { label: "Breadth", value: countContrib, max: 10 },
  ];

  // Cognitive-dissonance guard: when net flow is strongly negative but the
  // headline says mixed/cautious (because clusters or role-buys offset),
  // surface a one-line clarifier so users don't think the model is broken.
  const sellHeavyButHeadlineMixed =
    dollarContrib <= -6 && snapshot.index >= 35 && snapshot.index < 60;
  // Inverse: heavy buying flow but no clusters to back it up.
  const buyHeavyButNoClusters =
    dollarContrib >= 6 && snapshot.clusterCount === 0 && snapshot.index < 70;

  // Compose the dynamic "why" body so the line refers to today's actual
  // signal mix instead of a generic explainer. Reviewer feedback: the
  // reconciliation should sit immediately under the score with one
  // specific sentence ("cluster activity lifted it, broad selling held
  // it"), not the generic one we had before.
  const ceoCfoBuys = snapshot.leaderboard.filter(
    (r) => r.role === "CEO" || r.role === "CFO"
  ).length;
  const liftPieces: string[] = [];
  if (clusterContrib > 0) liftPieces.push(`${snapshot.clusterCount} cluster ${snapshot.clusterCount === 1 ? "buy" : "buys"}`);
  if (roleContrib > 0) liftPieces.push(`${ceoCfoBuys} C-suite buyer${ceoCfoBuys === 1 ? "" : "s"}`);
  const liftSummary = liftPieces.length ? liftPieces.join(" and ") : "selective bullish activity";

  return (
    <div className="mt-3 w-full max-w-[440px]">
      <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle text-center mb-1.5">
        Today's score drivers
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {pills.map((p) => {
          const tone =
            p.value > 1 ? "emerald" : p.value < -1 ? "crimson" : "muted";
          const cls =
            tone === "emerald"
              ? "border-emerald/30 bg-emerald-soft text-emerald"
              : tone === "crimson"
              ? "border-crimson/30 bg-crimson-soft text-crimson"
              : "border-border bg-surface-2 text-fg-muted";
          const sign = p.value > 0 ? "+" : p.value < 0 ? "" : "±";
          return (
            <div
              key={p.label}
              className={`rounded-md border px-2 py-1.5 text-center ${cls}`}
              title={`${p.label} contribution to today's index, max ±${p.max}`}
            >
              <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono leading-tight opacity-80 truncate">
                {p.label}
              </div>
              <div className="font-mono tab-num text-[14px] font-semibold leading-none mt-1">
                {sign}
                {p.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* "Why this matters despite X" clarifier — closes the trust gap
          when the chips look bearish but the headline doesn't. The body
          names today's actual cluster + CEO/CFO count so the reader sees
          the real cross-current, not a generic explainer. */}
      {(sellHeavyButHeadlineMixed || buyHeavyButNoClusters) && (
        <p className="mt-2 text-[11px] text-fg-subtle leading-relaxed text-center px-1">
          {sellHeavyButHeadlineMixed && (
            <>
              <strong className="text-fg-muted font-medium">Why the score stays neutral:</strong>{" "}
              {liftSummary} lifted it materially, but broad market-wide selling — most of it diversification or scheduled — held the index near 50. Read the leaderboard, not the headline number.
            </>
          )}
          {buyHeavyButNoClusters && (
            <>
              <strong className="text-fg-muted font-medium">Why not stronger:</strong>{" "}
              Net buying is positive but no cluster (3+ insiders, same name) has formed yet — and clusters are where the academic edge actually lives. The score waits for confirmation.
            </>
          )}
        </p>
      )}
    </div>
  );
}
