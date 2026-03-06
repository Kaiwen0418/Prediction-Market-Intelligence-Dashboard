"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MarketPollChart } from "@/components/charts/MarketPollChart";
import { LoadingState } from "@/components/layout/LoadingState";
import { MetricCard } from "@/components/layout/MetricCard";
import { SourceStatusCard } from "@/components/layout/SourceStatusCard";
import { TopNav } from "@/components/navigation/TopNav";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";
import { getLiveHistoryCases } from "@/services/history/liveHistory";
import supportDataset from "@/../public/data/state-party-support-2024.json";
import { researchCases, researchDataSources } from "@/services/history/researchStatic";

type Party = "Democrat" | "Republican";

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
      sourceUrl:
        "https://github.com/fivethirtyeight/data/blob/master/polls/2024-averages/presidential_general_averages_2024-09-12_uncorrected.csv",
      fieldDateLabel: point.date,
      methodology: "Local cleaned public resource from 538 daily averages",
      candidate: party
    };
  });
}

export function HistoryPageView() {
  const [party, setParty] = useState<Party>("Republican");
  const liveHistoryQuery = useQuery({
    queryKey: ["history-live-cases", party],
    queryFn: () => getLiveHistoryCases(party)
  });
  const sourceDiagnostics = useSourceDiagnostics();

  const availableStates = ["Arizona", "Georgia", "Michigan", "Pennsylvania", "Wisconsin"];
  const [activeState, setActiveState] = useState(availableStates[0]);
  const liveCase = liveHistoryQuery.data?.find((item) => item.state === activeState) ?? null;
  const researchCase = researchCases.find((item) => item.state === activeState) ?? researchCases[0];
  const pollSeries = buildPollSeries(activeState, party);
  const activeCase = liveCase
    ? { ...liveCase, pollSeries }
    : { ...researchCase, pollSeries, summary: `${party} polling shown from cleaned public dataset; market series is fallback research data.` };
  const pollingSources = Array.from(new Map(activeCase.pollSeries.map((point) => [point.source, point])).values());
  const usingLiveCases = Boolean(liveCase);

  useEffect(() => {
    if (!availableStates.includes(activeState)) {
      setActiveState(availableStates[0]);
    }
  }, [activeState]);

  if (liveHistoryQuery.isLoading && !liveHistoryQuery.data) {
    return <LoadingState label="Loading FiveThirtyEight polling averages and matching Polymarket state market histories..." />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <TopNav />

      <section className="panel px-6 py-6">
        <p className="metric-label">Historical Analysis</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Research-style market vs polling comparison</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {usingLiveCases
            ? `This route is using a cleaned public FiveThirtyEight state-support dataset together with matching Polymarket state-market history for selected battleground states, focused on ${party} support versus the matched ${party.toLowerCase()} contract line.`
            : "This route fell back to a static research demo dataset because the live battleground-state history fetch did not return enough usable data."}
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
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {["Arizona", "Georgia", "Michigan", "Pennsylvania", "Wisconsin"].map((state) => (
            <SourceStatusCard
              key={state}
              title={state}
              diagnostics={sourceDiagnostics[`history:${state}:${party}`]}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
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
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Lead-Lag"
          value={activeCase.leadLag.lagDays === 0 ? "Sync" : `${Math.abs(activeCase.leadLag.lagDays)}d`}
          detail={activeCase.leadLag.interpretation}
        />
        <MetricCard
          label="Correlation"
          value={String(activeCase.correlation.coefficient)}
          detail={`${activeCase.correlation.strength} relationship between market and polling series`}
        />
        <MetricCard
          label="Research Finding"
          value={activeCase.state}
          detail={activeCase.summary}
        />
        <MetricCard
          label="Volatility"
          value={`${activeCase.volatility.realizedVolatility}%`}
          detail={`Average return ${activeCase.volatility.averageReturn > 0 ? "+" : ""}${activeCase.volatility.averageReturn} pts`}
        />
      </section>

      <section className="panel px-6 py-6">
        <p className="metric-label">Time Series</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{activeCase.state}: {party} support against PM contract path</h2>
        <div className="mt-4 flex flex-wrap gap-3">
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
          {usingLiveCases
            ? `Data note: polling comes from a local cleaned public JSON resource derived from the referenced FiveThirtyEight CSV and uses ${party} support directly; market history comes from the matched ${party.toLowerCase()}-side Polymarket outcome routed through the app proxy at 1-day precision.`
            : "Static demo note: this page uses hardcoded research-style series for product presentation. It is informed by the paper's methodology and reported findings, but it is not a reproduction of the paper's raw underlying dataset."}
        </p>
        <div className="mt-6">
          <MarketPollChart marketSeries={activeCase.marketSeries} pollSeries={activeCase.pollSeries} />
        </div>
      </section>
    </main>
  );
}
