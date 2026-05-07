import { promises as fs } from "node:fs";
import path from "node:path";
import { Header } from "@/components/Header";
import { RiskBanner } from "@/components/RiskBanner";
import { Footer } from "@/components/Footer";
import { ConvictionDial } from "@/components/ConvictionDial";
import { NetFlowSpark } from "@/components/NetFlowSpark";
import { HeroDrivers } from "@/components/HeroDrivers";
import { RecentActivity } from "@/components/RecentActivity";
import { FilterTransparency } from "@/components/FilterTransparency";
import { ScoreExplainer } from "@/components/ScoreExplainer";
import { ReadingCautions } from "@/components/ReadingCautions";
import { InsightsCard } from "@/components/InsightsCard";
import { TradeBasketCard } from "@/components/TradeBasketCard";
import { Leaderboard } from "@/components/Leaderboard";
import { ClusterBuys } from "@/components/ClusterBuys";
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
    // No snapshot yet — render an empty state.
    // We deliberately do NOT fall back to seed data; the badge in the methodology
    // section was the only thing keeping us honest, and real data is now the only
    // path. Run `npm run ingest` (locally) or trigger the GitHub Actions workflow.
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

          {/* HERO — folded 55/45 */}
          <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4 lg:gap-6 items-stretch">
            <div className="rounded-lg border border-border bg-surface px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6 flex flex-col items-center hero-glow">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle text-center">
                Insider Conviction Index · S&amp;P 1500 · last 7 days
              </div>
              <div className="mt-1 sm:mt-2 w-full max-w-[440px]">
                <ConvictionDial value={snapshot.index} phase={snapshot.phase} />
              </div>
              <NetFlowSpark points={snapshot.history} />
              <HeroDrivers snapshot={snapshot} />
              <RecentActivity items={snapshot.recentActivity} />
            </div>
            <div className="flex flex-col gap-4">
              <InsightsCard snapshot={snapshot} className="flex-1" />
              <TradeBasketCard snapshot={snapshot} />
            </div>
          </section>

          {/* Score explainer — surface the math + academic basis */}
          <div className="mt-6">
            <ScoreExplainer snapshot={snapshot} />
          </div>

          {/* Indicators row */}
          <div className="mt-6">
            <IndicatorsRow indicators={snapshot.indicators} />
          </div>

          {/* Reading cautions — pre-empt the panic-sell instinct */}
          <div className="mt-6">
            <ReadingCautions />
          </div>

          {/* Cluster buys — moment of identity */}
          <div className="mt-6">
            <ClusterBuys clusters={snapshot.clusters} />
          </div>

          {/* Filter transparency — explain why our counts are smaller than raw EDGAR */}
          <div className="mt-6">
            <FilterTransparency
              filtered={snapshot.filtered}
              buyCount={snapshot.buyCount}
              sellCount={snapshot.sellCount}
            />
          </div>

          {/* Leaderboard */}
          <div className="mt-6">
            <Leaderboard rows={snapshot.leaderboard} />
          </div>

          {/* Sector heatmap */}
          <div className="mt-6">
            <SectorHeatmap sectors={snapshot.sectors} />
          </div>

          {/* Deep history */}
          <div className="mt-6">
            <HistoryChart history={snapshot.history} currentIndex={snapshot.index} />
          </div>

          {/* How we read the tape */}
          <section className="mt-6 mb-12 rounded-lg border border-border bg-surface-2 p-5 text-[13px] text-fg-muted leading-relaxed">
            <h3 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">How we read the tape</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-fg font-medium text-[13px]">Only real buys count</div>
                <p className="mt-1 text-[12.5px]">
                  We only count purchases insiders make on the open market with their own money. Routine grants, tax withholdings and option exercises are filtered out — those aren't conviction signals.
                </p>
              </div>
              <div>
                <div className="text-fg font-medium text-[13px]">Pre-scheduled sales filtered</div>
                <p className="mt-1 text-[12.5px]">
                  Most insider sales follow pre-set schedules and tell you nothing about timing. We strip those out before counting net selling, so the number you see is closer to a real signal.
                </p>
              </div>
              <div>
                <div className="text-fg font-medium text-[13px]">Roles weighted by access</div>
                <p className="mt-1 text-[12.5px]">
                  A CEO buy carries more weight than a director buy because the CEO sees more of what's coming. The conviction score reflects who is buying, not just how much.
                </p>
              </div>
            </div>
            <p className="mt-4 pt-3 border-t border-border text-[12px]">
              Source: <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald">SEC EDGAR Form 4 filings</a>, refreshed daily by an automated workflow. Trading on eToro requires a valid account; instrument coverage is verified against the eToro public catalog.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
