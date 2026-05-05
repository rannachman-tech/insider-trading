import { promises as fs } from "node:fs";
import path from "node:path";
import { Header } from "@/components/Header";
import { RiskBanner } from "@/components/RiskBanner";
import { Footer } from "@/components/Footer";
import { ConvictionDial } from "@/components/ConvictionDial";
import { NetFlowSpark } from "@/components/NetFlowSpark";
import { InsightsCard } from "@/components/InsightsCard";
import { TradeBasketCard } from "@/components/TradeBasketCard";
import { Leaderboard } from "@/components/Leaderboard";
import { ClusterBuys } from "@/components/ClusterBuys";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { IndicatorsRow } from "@/components/IndicatorsRow";
import { HistoryChart } from "@/components/HistoryChart";
import { LiveSourcesRow } from "@/components/LiveSourcesRow";
import { buildSeedHistory, buildSeedTransactions } from "@/lib/seed";
import { buildSnapshot } from "@/lib/snapshot";
import type { InsiderSnapshot } from "@/lib/types";

export const revalidate = 1800; // 30 min

async function loadSnapshot(): Promise<InsiderSnapshot> {
  const snapshotPath = path.join(process.cwd(), "data", "insider-snapshot.json");
  try {
    const buf = await fs.readFile(snapshotPath, "utf8");
    return JSON.parse(buf) as InsiderSnapshot;
  } catch {
    // Fallback — build a fresh seeded snapshot
    const generatedAt = new Date().toISOString();
    const txs = buildSeedTransactions(generatedAt);
    const s = buildSnapshot(txs, {
      generatedAt,
      windowDays: 7,
      clusterWindowDays: 30,
      clusterMinInsiders: 3,
      isDemo: true,
    });
    s.history = buildSeedHistory(generatedAt, s.index);
    s.sources = s.sources.map((src) =>
      src.name.includes("EDGAR") ? { ...src, note: "Demo mode — live ingest scheduled" } : src
    );
    return s;
  }
}

export default async function HomePage() {
  const snapshot = await loadSnapshot();

  return (
    <div className="flex flex-col min-h-screen">
      <RiskBanner />
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Top row: title + live status */}
          <div className="mt-6 sm:mt-8 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-fg">
                Are insiders buying their own stock?
              </h1>
              <p className="mt-1 text-[13px] text-fg-muted max-w-prose">
                A live read on what corporate insiders are doing with their personal cash — drawn from SEC EDGAR Form 4 filings, filtered for real conviction, and ranked.
              </p>
            </div>
            <LiveSourcesRow generatedAt={snapshot.generatedAt} sources={snapshot.sources} />
          </div>

          {/* HERO — folded 55/45 */}
          <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4 lg:gap-6 items-stretch">
            <div className="rounded-lg border border-border bg-surface p-5 sm:p-6 flex flex-col items-center hero-glow">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                Insider Conviction Index · S&P 1500 · 7-day rolling
              </div>
              <div className="mt-2 sm:mt-3 w-full max-w-[440px]">
                <ConvictionDial value={snapshot.index} phase={snapshot.phase} />
              </div>
              <NetFlowSpark points={snapshot.history} />
            </div>
            <div className="flex flex-col gap-4">
              <InsightsCard snapshot={snapshot} className="flex-1" />
              <TradeBasketCard phase={snapshot.phase} />
            </div>
          </section>

          {/* Indicators row */}
          <div className="mt-6">
            <IndicatorsRow indicators={snapshot.indicators} />
          </div>

          {/* Cluster buys — moment of identity */}
          <div className="mt-6">
            <ClusterBuys clusters={snapshot.clusters} />
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

          {/* Notes */}
          <section className="mt-6 mb-12 rounded-lg border border-border bg-surface-2 p-5 text-[13px] text-fg-muted leading-relaxed">
            <h3 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">Notes &amp; method</h3>
            <p className="mt-2">
              The Insider Conviction Index blends three signals: net Code-P dollar flow (55%), buyer/seller insider count (25%), and the number of cluster buys with three or more distinct insiders (20%). Code M (option exercise), F (tax withholding), A (grant), and 10b5-1 scheduled trades are excluded. Filings under $25,000 are dropped. Roles are weighted: CEO 1.0, CFO 0.95, President 0.85, Director 0.45.
            </p>
            <p className="mt-2">
              Source data: <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald">SEC EDGAR Form 4 atom feed</a>. Tradability resolved against the eToro public instrument catalog.
              {snapshot.isDemo && (
                <span className="ml-2 inline-block rounded bg-amber-soft text-amber border border-amber/30 px-1.5 py-0.5 text-[11px] font-mono">
                  Demo data
                </span>
              )}
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
