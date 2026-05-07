"use client";

import { useDeferredValue } from "react";
import { calculateEventImpact } from "@/analytics/eventImpact";
import { calculateLiquidity } from "@/analytics/liquidity";
import { calculateTradePressure } from "@/analytics/tradePressure";
import { DepthChart } from "@/components/charts/DepthChart";
import { ErrorState } from "@/components/layout/ErrorState";
import { LoadingState } from "@/components/layout/LoadingState";
import { MetricCard } from "@/components/layout/MetricCard";
import { SourceStatusCard } from "@/components/layout/SourceStatusCard";
import { TopNav } from "@/components/navigation/TopNav";
import { OrderBookTable } from "@/components/orderbook/OrderBookTable";
import { TradeTape } from "@/components/orderbook/TradeTape";
import { useMarketData } from "@/hooks/useMarketData";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useTimelineData } from "@/hooks/useTimelineData";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";
import { relativeTime } from "@/utils/time";

type MarketPageViewProps = {
  embedded?: boolean;
};

export function MarketPageView({ embedded = false }: MarketPageViewProps) {
  const { featuredMarketQuery, featuredMarket: market } = useMarketData({ strictFeaturedMarket: true });
  const { orderbook, snapshotQuery } = useOrderbook(market?.tokenId, {
    strictSnapshot: true,
    allowMockStreamFallback: false
  });
  const sources = useSourceDiagnostics();
  const deferredTrades = useDeferredValue(orderbook?.trades ?? []);
  const timelineQuery = useTimelineData(market);
  const deferredEvents = useDeferredValue(timelineQuery.data ?? []);
  const analytics =
    orderbook
      ? {
          liquidity: calculateLiquidity(orderbook),
          tradePressure: calculateTradePressure(orderbook.trades),
          eventImpact: calculateEventImpact(deferredEvents)
        }
      : null;
  const isLoading = featuredMarketQuery.isLoading || snapshotQuery.isLoading || timelineQuery.isLoading;
  const errorMessage = featuredMarketQuery.error instanceof Error
    ? featuredMarketQuery.error.message
    : snapshotQuery.error instanceof Error
      ? snapshotQuery.error.message
      : !market
        ? "No live market could be loaded for the configured slug."
        : !orderbook
          ? "No live orderbook snapshot could be loaded for the live market token."
          : null;

  if (isLoading) {
    return <LoadingState label="Connecting to live orderbook and market streams..." />;
  }

  if (errorMessage || !market || !orderbook || !analytics) {
    return (
      <ErrorState
        detail={errorMessage ?? "The live market page is configured to use real data only, and no usable live response was available."}
      />
    );
  }

  const content = (
    <>
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

      <section className="panel px-6 py-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="metric-label">Event Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Catalysts under the live market view</h2>
          </div>
          <p className="text-sm text-slate-500">
            {deferredEvents.length} events | strongest move {analytics.eventImpact.strongestMove > 0 ? "+" : ""}{analytics.eventImpact.strongestMove}%
          </p>
        </div>
        <div className="mt-6">
          <EventTimeline events={deferredEvents} />
        </div>
      </section>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-8">{content}</div>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <TopNav />
      {content}
    </main>
  );
}
