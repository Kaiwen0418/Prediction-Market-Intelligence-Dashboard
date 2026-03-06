"use client";

import { useDeferredValue } from "react";
import { DepthChart } from "@/components/charts/DepthChart";
import { LoadingState } from "@/components/layout/LoadingState";
import { MetricCard } from "@/components/layout/MetricCard";
import { SourceStatusCard } from "@/components/layout/SourceStatusCard";
import { TopNav } from "@/components/navigation/TopNav";
import { OrderBookTable } from "@/components/orderbook/OrderBookTable";
import { TradeTape } from "@/components/orderbook/TradeTape";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";
import { relativeTime } from "@/utils/time";

export function MarketPageView() {
  const { isLoading, market, orderbook, analytics } = useDashboardData();
  const sources = useSourceDiagnostics();
  const deferredTrades = useDeferredValue(orderbook?.trades ?? []);

  if (isLoading || !market || !orderbook || !analytics) {
    return <LoadingState label="Connecting to live orderbook and market streams..." />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <TopNav />

      <section className="panel px-6 py-6">
        <p className="metric-label">Realtime Market</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{market.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Outcome {market.outcomeLabel ?? "Primary"} | source {orderbook.source} | updated {relativeTime(orderbook.updatedAt)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Token ID: <span className="font-mono text-slate-900">{market.tokenId ?? "mock"}</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SourceStatusCard title="Featured Market" diagnostics={sources["featured-market"]} />
          <SourceStatusCard title="Orderbook" diagnostics={sources.orderbook} />
          <SourceStatusCard title="Trades" diagnostics={sources.trades} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Mid Price" value={orderbook.midPrice.toFixed(3)} detail="Derived from best bid and ask" />
        <MetricCard label="Spread" value={`${orderbook.spread.toFixed(3)}`} detail={`${analytics.liquidity.spreadBps} bps`} />
        <MetricCard
          label="Bid Depth"
          value={analytics.liquidity.totalBidDepth.toLocaleString()}
          detail={`Ask depth ${analytics.liquidity.totalAskDepth.toLocaleString()}`}
        />
        <MetricCard
          label="Trade Pressure"
          value={analytics.tradePressure.pressure}
          detail={`Buy/sell ratio ${analytics.tradePressure.ratio}`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="panel px-6 py-6">
          <p className="metric-label">Depth Chart</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Orderbook shape and near-touch liquidity</h2>
          <div className="mt-6">
            <DepthChart orderbook={orderbook} />
          </div>
        </div>
        <div className="panel px-6 py-6">
          <p className="metric-label">Trade Tape</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Recent prints</h2>
          <div className="mt-6">
            <TradeTape trades={deferredTrades} />
          </div>
        </div>
      </section>

      <section className="panel px-6 py-6">
        <p className="metric-label">Orderbook Ladder</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Level 2 market depth</h2>
        <div className="mt-6">
          <OrderBookTable orderbook={orderbook} />
        </div>
      </section>
    </main>
  );
}
