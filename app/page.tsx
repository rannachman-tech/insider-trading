import { promises as fs } from "node:fs";
import path from "node:path";
import { Header } from "@/components/Header";
import { RiskBanner } from "@/components/RiskBanner";
import { Footer } from "@/components/Footer";
import { ConvictionDial } from "@/components/ConvictionDial";
import { NetFlowSpark } from "@/components/NetFlowSpark";
import { FilterTransparency } from "@/components/FilterTransparency";
import { ScoreExplainer } from "@/components/ScoreExplainer";
import { ReadingCautions } from "@/components/ReadingCautions";
import { StrongestSignal } from "@/components/StrongestSignal";
import { WhyItMatters } from "@/components/WhyItMatters";
import { ScoreDrivers } from "@/components/ScoreDrivers";
// TopSignals removed — the leaderboard's significance ranking + HIGH/MED/LOW
// badges + LOW-hidden default now provide the same prioritization with no
// duplication. Component file kept in repo for a future v2 reincarnation
// when there's enough historical data to surface genuinely newsworthy
// patterns (first-time CEO buys, unusual size vs history, etc.).
import { TimeHorizonNote } from "@/components/TimeHorizonNote";
import { TodaysRead } from "@/components/TodaysRead";
import { InsightsCard } from "@/components/InsightsCard";
import { TradeBasketCard } from "@/components/TradeBasketCard";
import { Leaderboard } from "@/components/Leaderboard";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { IndicatorsRow } from "@/components/IndicatorsRow";
import { HistoryChart } from "@/components/HistoryChart";
import { LiveSourcesRow } from "@/components/LiveSourcesRow";
import type { InsiderSnapshot } from "@/lib/types";

export const revalidate = 1800; // 30 min

async function loadSnapshot(): Promise<InsiderSnapshot | null> {
  const snapshotPath = path.join(process.cwd(), "data", "insider-snapshot.json");
  try {
    const buf = await fs.readFile(snapshotPath, "utf8");
    return JSON.parse(buf) as InsiderSnapshot;
  } catch {
    return null;
  }
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <h2 className="text-lg font-semibold text-fg">No snapshot yet</h2>
        <p className="mt-2 text-[13.5px] text-fg-muted leading-relaxed max-w-prose mx-auto">
          The latest EDGAR ingest hasn't run. Trigger the <span className="font-mono">Ingest EDGAR Form 4</span> workflow on GitHub, or run <span className="font-mono">npm run ingest</span> locally, to populate the dashboard.
        </p>
      </div>
    </div>
  );
}

/**
 * Page structure follows a 4-tier hierarchy:
 *
 *   Tier 1 — core insight (always visible, prominent):
 *     Hero (dial + score drivers + spark) · Today's Read · Strongest Signal · Top Signals
 *
 *   Tier 2 — action layer (data tables):
 *     Leaderboard · Sector heatmap
 *
 *   Tier 3 — understanding (lighter visual weight):
 *     Indicators row · Why It Matters · Reading Cautions
 *
 *   Tier 4 — reference (collapsed/light):
 *     Score explainer (default closed) · Filter transparency · 12-month chart · methodology footer
 */
export default async function HomePage() {
  const snapshot = await loadSnapshot();

  if (!snapshot) {
    return (
      <div className="flex flex-col min-h-screen">
        <RiskBanner />
        <Header />
        <main className="flex-1">
          <EmptyState />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <RiskBanner />
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Top row: title + live status */}
          <div className="mt-6 sm:mt-8 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-fg">
                Are insiders buying their own stock?
              </h1>
              <p className="mt-1 text-[13px] sm:text-[14px] text-fg-muted max-w-[58ch] leading-relaxed">
                A weekly read on what CEOs, CFOs and directors are doing with their personal cash. Pulled live from SEC filings, cleaned of routine noise, and ranked by who's buying and how much.
              </p>
            </div>
            <LiveSourcesRow generatedAt={snapshot.generatedAt} sources={snapshot.sources} />
          </div>

          <TimeHorizonNote />

          {/* ─────────────── TIER 1 — core insight ─────────────── */}

          {/* HERO — folded 55/45. items-start (not items-stretch) so the
              right column sizes to its own content; the dial+drivers+spark
              stack on the left can be much taller without leaving white
              space below the InsightsCard on the right. */}
          <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4 lg:gap-6 items-start">
            <div className="rounded-lg border border-border bg-surface px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6 flex flex-col items-center hero-glow">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle text-center">
                Insider Conviction Index · S&amp;P 1500 · last 7 days
              </div>
              {/* Dial sized down ~20% from the original 440px so the gauge
                  supports rather than dominates the hero. ScoreDrivers and
                  the spark below stay at 440px width. */}
              <div className="mt-1 sm:mt-2 w-full max-w-[360px]">
                <ConvictionDial value={snapshot.index} phase={snapshot.phase} />
              </div>
              <ScoreDrivers snapshot={snapshot} />
              <NetFlowSpark points={snapshot.history} />
            </div>
            <div className="flex flex-col gap-4">
              <InsightsCard snapshot={snapshot} />
              <TradeBasketCard snapshot={snapshot} />
            </div>
          </section>

          {/* "So what" auto-narrative line — under the hero, above the prioritized signals */}
          <div className="mt-6">
            <TodaysRead snapshot={snapshot} />
          </div>

          {/* Today's strongest signal — cluster headline */}
          <div className="mt-4">
            <StrongestSignal snapshot={snapshot} />
          </div>

          {/* ─────────────── TIER 2 — action layer ─────────────── */}

          <div className="mt-10">
            <Leaderboard rows={snapshot.leaderboard} />
          </div>

          <div className="mt-6">
            <SectorHeatmap sectors={snapshot.sectors} />
          </div>

          {/* ─────────────── TIER 3 — understanding ─────────────── */}

          <div className="mt-10">
            <IndicatorsRow indicators={snapshot.indicators} />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WhyItMatters />
            <ReadingCautions />
          </div>

          {/* ─────────────── TIER 4 — reference ─────────────── */}

          <div className="mt-10">
            <ScoreExplainer snapshot={snapshot} />
          </div>

          <div className="mt-4">
            <FilterTransparency
              filtered={snapshot.filtered}
              buyCount={snapshot.buyCount}
              sellCount={snapshot.sellCount}
            />
          </div>

          <div className="mt-4">
            <HistoryChart history={snapshot.history} currentIndex={snapshot.index} />
          </div>

          {/* Compact methodology footer — reading windows + source only.
              Filter discipline already lives in FilterTransparency above. */}
          <section className="mt-4 mb-12 rounded-lg border border-border bg-surface-2 px-5 py-4 text-[12.5px] text-fg-muted leading-relaxed">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-fg-subtle mb-2">
              Reading windows used on this page
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
              <li>
                <span className="font-mono tab-num text-fg">7 days</span>
                <span className="text-fg-subtle"> · leaderboard, net flow, headline index</span>
              </li>
              <li>
                <span className="font-mono tab-num text-fg">30 days</span>
                <span className="text-fg-subtle"> · cluster-buy detection</span>
              </li>
              <li>
                <span className="font-mono tab-num text-fg">12 months</span>
                <span className="text-fg-subtle"> · history chart, percentile context</span>
              </li>
            </ul>
            <p className="mt-3 pt-3 border-t border-border text-[12px]">
              Source:{" "}
              <a
                href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald"
              >
                SEC EDGAR Form 4 filings
              </a>
              , refreshed daily. Instrument coverage verified against the eToro public catalog.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
