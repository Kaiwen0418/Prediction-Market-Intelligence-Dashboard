"use client";

import { MarketPollChart } from "@/components/charts/MarketPollChart";
import { LoadingState } from "@/components/layout/LoadingState";
import { MetricCard } from "@/components/layout/MetricCard";
import { SourceStatusCard } from "@/components/layout/SourceStatusCard";
import { TopNav } from "@/components/navigation/TopNav";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";

export function HistoryPageView() {
  const { isLoading, market, marketSeries, pollSeries, analytics } = useDashboardData();
  const sources = useSourceDiagnostics();

  if (isLoading || !market || !analytics) {
    return <LoadingState label="Loading historical market and polling series..." />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <TopNav />

      <section className="panel px-6 py-6">
        <p className="metric-label">Historical Analysis</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Market vs polls for {market.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          This view focuses on whether the market is anticipating polling movement or merely reacting to it.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SourceStatusCard title="Featured Market" diagnostics={sources["featured-market"]} />
          <SourceStatusCard title="Price History" diagnostics={sources["price-history"]} />
          <SourceStatusCard title="Polling" diagnostics={sources.polling} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Lead-Lag"
          value={analytics.leadLag.lagDays === 0 ? "Sync" : `${Math.abs(analytics.leadLag.lagDays)}d`}
          detail={analytics.leadLag.interpretation}
        />
        <MetricCard
          label="Correlation"
          value={String(analytics.correlation.coefficient)}
          detail={`${analytics.correlation.strength} relationship between market and polling series`}
        />
        <MetricCard
          label="1D Momentum"
          value={`${analytics.momentum.oneDay > 0 ? "+" : ""}${analytics.momentum.oneDay} pts`}
          detail={`7D ${analytics.momentum.sevenDay > 0 ? "+" : ""}${analytics.momentum.sevenDay} pts`}
        />
        <MetricCard
          label="Volatility"
          value={`${analytics.volatility.realizedVolatility}%`}
          detail={`Average return ${analytics.volatility.averageReturn > 0 ? "+" : ""}${analytics.volatility.averageReturn} pts`}
        />
      </section>

      <section className="panel px-6 py-6">
        <p className="metric-label">Time Series</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Probability path against polling composite</h2>
        <div className="mt-6">
          <MarketPollChart marketSeries={marketSeries} pollSeries={pollSeries} />
        </div>
      </section>
    </main>
  );
}
