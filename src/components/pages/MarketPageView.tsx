"use client";

import { useDeferredValue } from "react";
import { PolymarketHistoryChart } from "@/components/charts/PolymarketHistoryChart";
import { ErrorState } from "@/components/layout/ErrorState";
import { LoadingState } from "@/components/layout/LoadingState";
import { UsMarketMap } from "@/components/maps/UsMarketMap";
import { TopNav } from "@/components/navigation/TopNav";
import { useMarketData } from "@/hooks/useMarketData";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useTimelineData } from "@/hooks/useTimelineData";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";
import { formatTimestamp } from "@/utils/time";

type MarketPageViewProps = {
  embedded?: boolean;
  staticMode?: boolean;
};

export function MarketPageView({ embedded = false, staticMode = false }: MarketPageViewProps) {
  const { featuredMarketQuery, featuredMarket: market, historicalSeriesQuery, marketSeries } = useMarketData({
    strictFeaturedMarket: !staticMode
  });
  const { orderbook, snapshotQuery } = useOrderbook(market?.tokenId, {
    strictSnapshot: !staticMode,
    allowMockStreamFallback: staticMode,
    enableRealtime: !staticMode
  });
  const sources = useSourceDiagnostics();
  const timelineQuery = useTimelineData(market);
  const deferredEvents = useDeferredValue(timelineQuery.data ?? []);
  const isLoading = featuredMarketQuery.isLoading || snapshotQuery.isLoading;
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

  if (errorMessage || !market || !orderbook) {
    return (
      <ErrorState
        detail={
          errorMessage ??
          (staticMode
            ? "The static showcase could not load even the fallback market data."
            : "The live market page is configured to use real data only, and no usable live response was available.")
        }
      />
    );
  }

  const content = (
    <>
      <section>
        <p className="metric-label">Interactive Map</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <h2 className="max-w-4xl text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
            {market.outcomeLabel ?? market.title}
          </h2>
          <p className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
            {formatTimestamp(orderbook.updatedAt, "MMM d, HH:mm:ss")}
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:leading-7">
          The map is now the primary navigation surface. Click a state to zoom in and move the current live market
          context into the right-side rail.
        </p>
        <div className="mt-6">
          <UsMarketMap
            market={market}
            orderbook={orderbook}
            sources={{
              featuredMarket: sources["featured-market"],
              orderbook: sources.orderbook,
              trades: sources.trades
            }}
          />
        </div>
      </section>

      <section className="border-t border-[var(--demo-card-divider)] pt-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="metric-label">Price History</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Annotated Polymarket contract path</h2>
          </div>
          <p className="text-sm leading-6 text-slate-500 md:max-w-[280px] md:text-right">
            {historicalSeriesQuery.isLoading
              ? "Loading history..."
              : `${marketSeries.length} points · ${sources["price-history"]?.state ?? "fallback"} · ${sources["price-history"]?.mode ?? "mock"}`}
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:leading-7">
          The line uses Polymarket contract history for the current outcome. When live history is unavailable, this
          section falls back to the local market history series. Annotation copy is placeholder-driven when no usable
          event mapping is available.
        </p>
        <div className="mt-6">
          <PolymarketHistoryChart events={deferredEvents} series={marketSeries} />
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
