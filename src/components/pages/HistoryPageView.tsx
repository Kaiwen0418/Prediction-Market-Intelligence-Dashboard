"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DivergenceGapChart } from "@/components/charts/DivergenceGapChart";
import { EventWindowBarChart } from "@/components/charts/EventWindowBarChart";
import { MarketPollChart } from "@/components/charts/MarketPollChart";
import { RollingCorrelationChart } from "@/components/charts/RollingCorrelationChart";
import { RollingVolatilityChart } from "@/components/charts/RollingVolatilityChart";
import { ShockWindowBarChart } from "@/components/charts/ShockWindowBarChart";
import { StateMetricSmallMultiples } from "@/components/charts/StateMetricSmallMultiples";
import { StateSignalMatrix } from "@/components/charts/StateSignalMatrix";
import { LoadingState } from "@/components/layout/LoadingState";
import { ProductDemoShell } from "@/components/layout/ProductDemoShell";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";
import { getShockWindows } from "@/services/analytics/api";
import { getLiveHistoryCases, getLiveHistoryOverview } from "@/services/history/liveHistory";
import supportDataset from "@/../public/data/state-party-support-2024.json";
import { researchCases, researchDataSources } from "@/services/history/researchStatic";

type Party = "Democrat" | "Republican";

function sourceTone(state?: string) {
  if (state === "live") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (state === "fallback") return "border-amber-200 bg-amber-50 text-amber-900";
  if (state === "failed") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function buildPollSeries(state: string, party: Party) {
  const stateData = supportDataset.states.find((entry) => entry.state === state);
  if (!stateData) return [];

  return stateData.series.flatMap((point) => {
    const support = party === "Republican" ? point.republican : point.democrat;
    if (typeof support !== "number") {
      return [];
    }

    return {
      timestamp: new Date(point.date).toISOString(),
      pollAverage: support,
      sampleSize: 0,
      source: "FiveThirtyEight cleaned public dataset",
      sourceUrl: "https://github.com/kevin-claw-agent/poll-data",
      fieldDateLabel: point.date,
      methodology: "Daily mean across all available 538 poll rows for the same state, date, and party",
      candidate: party
    };
  });
}

function buildCoverage(
  pollSeries: Array<{ timestamp: string }>,
  marketSeries: Array<{ timestamp: string }>
) {
  const marketDays = new Set(marketSeries.map((point) => point.timestamp.slice(0, 10)));
  const alignedDays = Array.from(
    new Set(pollSeries.map((point) => point.timestamp.slice(0, 10)).filter((day) => marketDays.has(day)))
  ).sort((left, right) => left.localeCompare(right));

  return {
    pollStart: pollSeries[0]?.timestamp.slice(0, 10),
    pollEnd: pollSeries.at(-1)?.timestamp.slice(0, 10),
    pollPoints: pollSeries.length,
    marketStart: marketSeries[0]?.timestamp.slice(0, 10),
    marketEnd: marketSeries.at(-1)?.timestamp.slice(0, 10),
    marketPoints: marketSeries.length,
    alignedStart: alignedDays[0],
    alignedEnd: alignedDays.at(-1),
    alignedPoints: alignedDays.length
  };
}

export function HistoryPageView() {
  const [party, setParty] = useState<Party>("Republican");
  const liveHistoryQuery = useQuery({
    queryKey: ["history-live-cases", party],
    queryFn: () => getLiveHistoryCases(party)
  });
  const overviewQuery = useQuery({
    queryKey: ["history-overview", party],
    queryFn: () => getLiveHistoryOverview(party)
  });
  const sourceDiagnostics = useSourceDiagnostics();

  const availableStates = ["Arizona", "Georgia", "Michigan", "Pennsylvania", "Wisconsin"];
  const [activeState, setActiveState] = useState(availableStates[0]);
  const liveCase = liveHistoryQuery.data?.find((item) => item.state === activeState) ?? null;
  const researchCase = researchCases.find((item) => item.state === activeState) ?? researchCases[0];
  const pollSeries = buildPollSeries(activeState, party);
  const fallbackCoverage = buildCoverage(pollSeries, researchCase.marketSeries);
  const activeCase = liveCase
    ? { ...liveCase, pollSeries }
    : {
        ...researchCase,
        analyticsSource: "local" as const,
        researchSource: "local" as const,
        divergence: {
          averageGap: 0,
          maxGap: 0,
          currentGap: 0
        },
        pollSeries,
        rollingCorrelation: {
          coefficient: researchCase.correlation.coefficient,
          windowSize: Math.min(30, researchCase.marketSeries.length),
          points: []
        },
        eventWindow: {
          anchorIndex: Math.max(researchCase.marketSeries.length - 1, 0),
          anchorTimestamp: researchCase.marketSeries.at(-1)?.timestamp ?? "",
          preChange: 0,
          postChange: 0,
          netMove: 0,
          preWindow: 3,
          postWindow: 3
        },
        provenance: {
          computedAt: new Date().toISOString(),
          pollDatasetGeneratedAt: undefined,
          marketDatasetGeneratedAt: undefined
        },
        coverage: fallbackCoverage,
        narrative: {
          overview: `${activeState} ${party.toLowerCase()} support is displayed from a local fallback bundle because the live research summary was unavailable.`,
          methodology: "This fallback route pairs cleaned public polling support with a static research-style market series and local analytics."
        },
        researchHighlights: {
          shockLabel: "Shock window analysis is unavailable in the static fallback bundle.",
          leadLagLabel: researchCase.leadLag.interpretation,
          divergenceLabel: "Divergence summary is only calculated when the live analytics pipeline is available."
        },
        summary: `${party} polling shown from cleaned public dataset; market series is fallback research data.`,
      };
  const pollingSources = Array.from(new Map(activeCase.pollSeries.map((point) => [point.source, point])).values());
  const usingLiveCases = Boolean(liveCase);
  const comparisonCases = overviewQuery.data?.items?.length
    ? overviewQuery.data.items
        .filter((item) => availableStates.includes(item.state))
        .map((item) => ({
          state: item.state,
          leadLagDays: item.leadLagDays,
          volatility: item.volatility,
          divergence: item.divergence,
          correlation: item.correlation,
        }))
    : (liveHistoryQuery.data ?? [])
        .filter((item) => availableStates.includes(item.state))
        .map((item) => ({
          state: item.state,
          leadLagDays: item.leadLag.lagDays,
          volatility: item.volatility.realizedVolatility,
          divergence: item.divergence.currentGap,
          correlation: item.correlation.coefficient,
        }));
  const shockWindowsQuery = useQuery({
    queryKey: ["history-shock-windows", activeCase.state, party, activeCase.marketSeries.length],
    queryFn: () => getShockWindows(activeCase.marketSeries, 7, 3),
    enabled: activeCase.marketSeries.length >= 2
  });

  useEffect(() => {
    if (!availableStates.includes(activeState)) {
      setActiveState(availableStates[0]);
    }
  }, [activeState]);

  if (liveHistoryQuery.isLoading && !liveHistoryQuery.data) {
    return <LoadingState label="Loading FiveThirtyEight polling averages and matching Polymarket state market histories..." />;
  }

  return (
    <ProductDemoShell
      barLeft="Prediction Market Intelligence"
      barCenter="Research + Historical Comparison"
      barRight="Cached public polling and PM history"
      title={
        <>
          Research
          <br />
          Signal
        </>
      }
      showHero={false}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section>
          <p className="metric-label">Historical Analysis</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Research-style market vs polling comparison</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {activeCase.narrative?.overview}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <a
              href={researchDataSources.paper}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              Paper source
            </a>
            <a
              href={researchDataSources.polymarket}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              Prediction market source
            </a>
            <a
              href={researchDataSources.fivethirtyeight}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              Polling aggregate reference
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {usingLiveCases
              ? `Live source mode: public cleaned 538 dataset + Polymarket historical prices (${party})`
              : "Fallback mode: research-inspired static series"}
          </p>
          {activeCase.coverage ? (
            <p className="mt-2 text-sm text-slate-500">
              Coverage: polls {activeCase.coverage.pollStart ?? "unknown"} to {activeCase.coverage.pollEnd ?? "unknown"} ({activeCase.coverage.pollPoints} points)
              {" · "}
              market {activeCase.coverage.marketStart ?? "unknown"} to {activeCase.coverage.marketEnd ?? "unknown"} ({activeCase.coverage.marketPoints} points)
              {" · "}
              aligned {activeCase.coverage.alignedPoints} days
            </p>
          ) : null}
        </section>

        <section className="border-t border-[var(--demo-card-divider)] pt-8">
          <div className="flex flex-wrap items-center gap-3">
            {(["Republican", "Democrat"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setParty(option)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  option === party
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {availableStates.map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => setActiveState(state)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  state === activeState
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {state}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {["Arizona", "Georgia", "Michigan", "Pennsylvania", "Wisconsin"].map((state) => {
              const diagnostics = sourceDiagnostics[`history:${state}:${party}`];
              const backendDiagnostics = sourceDiagnostics[`history-backend:${state}:${party}`];
              const checkedAt = diagnostics?.checkedAt;

              return (
                <div
                  key={state}
                  className={`rounded-2xl border px-4 py-3 text-sm ${sourceTone(diagnostics?.state)}`}
                >
                  <p className="metric-label">{state}</p>
                  <p className="mt-1 font-medium capitalize">
                    {diagnostics?.state ?? "pending"} · {diagnostics?.mode ?? "mock"}
                  </p>
                  <p className="mt-1 text-xs opacity-80 capitalize">
                    backend {backendDiagnostics?.state ?? "pending"}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {checkedAt
                      ? `Checked ${new Date(checkedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric"
                        })}`
                      : "Not checked yet"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-[var(--demo-card-divider)] pt-8">
          <div>
            <p className="metric-label">Cross-State Parameters</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Small multiples across battleground states</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">
              This panel compresses the current parameter state across all tracked states so the page reads like a research surface rather than a single-case report.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
              Cross-state source: {overviewQuery.data ? "FastAPI overview route" : "frontend aggregated state summaries"}
            </p>
            <div className="mt-6">
              <StateMetricSmallMultiples data={comparisonCases} />
            </div>
            <div className="mt-6">
              <p className="metric-label">State Signal Matrix</p>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
                Heat-style matrix for the latest cross-state parameter snapshot. It compresses relative signal strength into a compact comparative surface.
              </p>
              <div className="mt-4">
                <StateSignalMatrix data={comparisonCases} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--demo-card-divider)] pt-8">
          <div>
            <p className="metric-label">Analytical Summary</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Regime, repricing, and event response</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">
              This section shifts the page away from isolated KPI figures and toward continuous analytical surfaces. The emphasis is on how alignment, volatility, and repricing evolve across the full market path.
            </p>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="metric-label">Rolling Correlation Path</p>
                  <p className="mt-2 text-sm text-slate-500">
                    FastAPI computes a trailing {activeCase.rollingCorrelation.windowSize}-day alignment score after date-matching the market and polling series.
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700">{activeCase.rollingCorrelation.coefficient}</p>
              </div>
              <div className="mt-4">
                <RollingCorrelationChart rollingCorrelation={activeCase.rollingCorrelation} />
              </div>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="metric-label">Lead-Lag + Event Window</p>
                  <p className="mt-2 text-sm text-slate-500">
                    The lag offset gives the structural timing relationship; the event window shows how sharply the market repriced before and after the main shock.
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {activeCase.leadLag.lagDays === 0 ? "Sync" : `${Math.abs(activeCase.leadLag.lagDays)}d`}
                </p>
              </div>
              <div className="mt-4">
                <EventWindowBarChart eventWindow={activeCase.eventWindow} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="metric-label">Lead-Lag Interpretation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{activeCase.leadLag.interpretation}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="metric-label">Window Geometry</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    -{activeCase.eventWindow.preWindow} / +{activeCase.eventWindow.postWindow} around {activeCase.eventWindow.anchorTimestamp.slice(0, 10)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="metric-label">Rolling Volatility Path</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Trailing market volatility regime. This reveals whether repricing is compressing or accelerating into event windows.
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700">{activeCase.volatility.realizedVolatility}%</p>
              </div>
              <div className="mt-4">
                <RollingVolatilityChart series={activeCase.marketSeries} />
              </div>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="metric-label">Signed Divergence Path</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Positive values mean the market prices the selected party above polling. Negative values mean PM is discounting the polling average.
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700">{activeCase.divergence.currentGap} pts</p>
              </div>
              <div className="mt-4">
                <DivergenceGapChart marketSeries={activeCase.marketSeries} pollSeries={activeCase.pollSeries} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="metric-label">Current</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{activeCase.divergence.currentGap} pts</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="metric-label">Average</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{activeCase.divergence.averageGap} pts</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="metric-label">Maximum</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{activeCase.divergence.maxGap} pts</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="metric-label">Shock Windows</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Largest {shockWindowsQuery.data?.summary.topK ?? 3} trailing {shockWindowsQuery.data?.summary.windowSize ?? 7}-day moves in the market path, ranked by absolute repricing and local volatility.
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {shockWindowsQuery.data?.source === "api" ? "FastAPI + NumPy" : "local fallback"}
                </p>
              </div>
              <div className="mt-4">
                <ShockWindowBarChart windows={shockWindowsQuery.data?.summary.windows ?? []} />
              </div>
            </div>
            <div className="grid gap-3">
              {(shockWindowsQuery.data?.summary.windows ?? []).map((window, index) => (
                <div key={`${window.anchorTimestamp}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="metric-label">Window {index + 1}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {window.netMove >= 0 ? "+" : ""}
                        {window.netMove} pts
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{window.startTimestamp.slice(5, 10)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {window.startTimestamp.slice(0, 10)} to {window.endTimestamp.slice(0, 10)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Abs move {window.absoluteMove} pts · local vol {window.localVolatility}%
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <p className="metric-label">Research Finding</p>
            <p className="mt-3 text-xl font-semibold text-slate-900">{activeCase.state}</p>
            <p className="mt-2 max-w-4xl text-sm text-slate-500">{activeCase.summary}</p>
            {activeCase.researchHighlights ? (
              <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <p>{activeCase.researchHighlights.shockLabel}</p>
                <p>{activeCase.researchHighlights.leadLagLabel}</p>
                <p>{activeCase.researchHighlights.divergenceLabel}</p>
              </div>
            ) : null}
            {activeCase.provenance ? (
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-400">
                computed {new Date(activeCase.provenance.computedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            ) : null}
          </div>
        </section>

        <section className="border-t border-[var(--demo-card-divider)] pt-8">
          <p className="metric-label">Time Series</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {activeCase.state}: {party} support against PM contract path
          </h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
            {pollingSources.map((point) => (
              <a
                key={`${point.source}-${point.timestamp}`}
                href={point.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 hover:border-slate-300 hover:text-slate-900"
              >
                {point.source}
              </a>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            {activeCase.narrative?.methodology}
          </p>
          <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
            Analytics engine: {activeCase.analyticsSource === "api" ? "FastAPI + NumPy" : "local TypeScript fallback"}
          </p>
          <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
            Research bundle: {activeCase.researchSource === "api" ? "FastAPI state summary route" : "local frontend assembly"}
          </p>
          {activeCase.provenance?.pollDatasetGeneratedAt || activeCase.provenance?.marketDatasetGeneratedAt ? (
            <p className="mt-3 text-xs text-slate-500">
              Dataset freshness: polls {activeCase.provenance?.pollDatasetGeneratedAt ?? "unknown"} · market {activeCase.provenance?.marketDatasetGeneratedAt ?? "unknown"}
            </p>
          ) : null}
          <div className="mt-6">
            <MarketPollChart
              eventWindow={activeCase.eventWindow}
              marketSeries={activeCase.marketSeries}
              pollSeries={activeCase.pollSeries}
              shockWindows={shockWindowsQuery.data?.summary.windows ?? []}
            />
          </div>
        </section>
      </div>
    </ProductDemoShell>
  );
}
