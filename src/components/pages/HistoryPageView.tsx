"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MarketPollChart } from "@/components/charts/MarketPollChart";
import { LoadingState } from "@/components/layout/LoadingState";
import { MetricCard } from "@/components/layout/MetricCard";
import { TopNav } from "@/components/navigation/TopNav";
import { getLiveHistoryCases } from "@/services/history/liveHistory";
import { researchCases, researchDataSources } from "@/services/history/researchStatic";

export function HistoryPageView() {
  const liveHistoryQuery = useQuery({
    queryKey: ["history-live-cases"],
    queryFn: getLiveHistoryCases
  });

  const cases = liveHistoryQuery.data?.length ? liveHistoryQuery.data : researchCases;
  const [activeState, setActiveState] = useState(cases[0].state);
  const activeCase = cases.find((item) => item.state === activeState) ?? cases[0];
  const pollingSources = Array.from(new Map(activeCase.pollSeries.map((point) => [point.source, point])).values());
  const usingLiveCases = Boolean(liveHistoryQuery.data?.length);

  useEffect(() => {
    if (!cases.some((item) => item.state === activeState)) {
      setActiveState(cases[0].state);
    }
  }, [activeState, cases]);

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
            ? "This route is using FiveThirtyEight state-average polling data together with matching Polymarket state-market history for selected battleground states."
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
            ? "Live source mode: 538 CSV + Polymarket historical prices"
            : "Fallback mode: research-inspired static series"}
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        {researchCases.map((item) => (
          <button
            key={item.state}
            type="button"
            onClick={() => setActiveState(item.state)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              item.state === activeCase.state
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {item.state}
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
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{activeCase.state}: market path against polling composite</h2>
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
            ? "Data note: polling comes from the referenced FiveThirtyEight CSV snapshot, while market history comes from the matching Polymarket state event routed through the app proxy."
            : "Static demo note: this page uses hardcoded research-style series for product presentation. It is informed by the paper's methodology and reported findings, but it is not a reproduction of the paper's raw underlying dataset."}
        </p>
        <div className="mt-6">
          <MarketPollChart marketSeries={activeCase.marketSeries} pollSeries={activeCase.pollSeries} />
        </div>
      </section>
    </main>
  );
}
