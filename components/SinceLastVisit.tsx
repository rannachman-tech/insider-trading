"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { InsiderSnapshot } from "@/lib/types";

interface Props {
  snapshot: InsiderSnapshot;
}

interface VisitMemo {
  /** Snapshot generatedAt the user last saw (ISO string). */
  generatedAt: string;
  /** Signature for each cluster the user has already seen: "TICKER|insiderCount". */
  clusterSigs: string[];
  /** Set of leaderboard tickers the user has already seen. */
  leaderboardTickers: string[];
}

const KEY = "iac:last-visit";

/**
 * Lightweight retention hook — compares today's snapshot against the one
 * the user saw last time and surfaces what's new. Pure client-side: the
 * memo lives in localStorage, so it's per-device but needs no auth,
 * backend, or schema change.
 *
 * Suppressed when:
 *   - First visit (no memo yet)
 *   - Same snapshot the user already saw (generatedAt unchanged)
 *   - Nothing new actually appeared
 *   - User dismissed the banner this session
 *
 * After render, the memo is updated to today's snapshot — so the next
 * visit's "new" comparison is relative to this one.
 */
export function SinceLastVisit({ snapshot }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [memo, setMemo] = useState<VisitMemo | null>(null);

  // Read memo once on mount. We deliberately defer updating it until the
  // user has actually seen the page (gives unmount/page-leave time too).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VisitMemo;
        if (parsed && Array.isArray(parsed.clusterSigs) && Array.isArray(parsed.leaderboardTickers)) {
          setMemo(parsed);
        }
      }
    } catch {
      // Storage disabled / quota — silently degrade
    }
  }, []);

  // After rendering once, snapshot today's state so the next visit can
  // diff against it. Wrapped in a separate effect with a small delay so
  // we don't overwrite the memo before computing newness on first paint.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const next: VisitMemo = {
          generatedAt: snapshot.generatedAt,
          clusterSigs: snapshot.clusters.map((c) => `${c.ticker}|${c.insiderCount}`),
          leaderboardTickers: snapshot.leaderboard.map((r) => r.ticker),
        };
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }, 2_000);
    return () => clearTimeout(t);
  }, [snapshot.generatedAt, snapshot.clusters, snapshot.leaderboard]);

  if (!memo || dismissed) return null;
  if (memo.generatedAt === snapshot.generatedAt) return null;

  // Compute newness
  const seenClusters = new Set(memo.clusterSigs);
  const newClusters = snapshot.clusters.filter(
    (c) => !seenClusters.has(`${c.ticker}|${c.insiderCount}`)
  );
  const seenTickers = new Set(memo.leaderboardTickers);
  const newTickers = snapshot.leaderboard.filter((r) => !seenTickers.has(r.ticker));
  const totalNew = newClusters.length + newTickers.length;
  if (totalNew === 0) return null;

  const lastVisitLabel = formatLastVisit(memo.generatedAt);
  const message = composeMessage(newClusters.length, newTickers.length, lastVisitLabel);

  return (
    <section className="mt-4 rounded-md border border-emerald/30 bg-emerald-soft/60 px-4 py-2.5 flex items-start gap-2.5">
      <Sparkles className="h-4 w-4 text-emerald flex-shrink-0 mt-0.5" aria-hidden />
      <p className="flex-1 text-[13px] text-fg leading-relaxed">{message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-0.5 -m-0.5 text-fg-muted hover:text-fg"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}

function formatLastVisit(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "your last visit";
    const now = Date.now();
    const diffH = Math.round((now - d.getTime()) / 3_600_000);
    if (diffH < 24) return `${diffH} hour${diffH === 1 ? "" : "s"} ago`;
    const diffD = Math.round(diffH / 24);
    if (diffD <= 14) return `${diffD} day${diffD === 1 ? "" : "s"} ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return "your last visit";
  }
}

function composeMessage(newClusters: number, newTickers: number, lastVisit: string): string {
  if (newClusters > 0 && newTickers > 0) {
    return `Since you last checked (${lastVisit}): ${newClusters} new cluster ${newClusters === 1 ? "setup" : "setups"} detected and ${newTickers} new ticker${newTickers === 1 ? "" : "s"} on the leaderboard.`;
  }
  if (newClusters > 0) {
    return `Since you last checked (${lastVisit}): ${newClusters} new cluster ${newClusters === 1 ? "setup" : "setups"} detected.`;
  }
  return `Since you last checked (${lastVisit}): ${newTickers} new ticker${newTickers === 1 ? "" : "s"} on the leaderboard.`;
}
