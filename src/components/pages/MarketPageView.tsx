"use client";

import { useDeferredValue, useState } from "react";
import { PolymarketHistoryChart } from "@/components/charts/PolymarketHistoryChart";
import { ErrorState } from "@/components/layout/ErrorState";
import { LoadingState } from "@/components/layout/LoadingState";
import { getSpotlightState } from "@/components/maps/spotlightStates";
import { UsMarketMap } from "@/components/maps/UsMarketMap";
import { TopNav } from "@/components/navigation/TopNav";
import { useMarketData } from "@/hooks/useMarketData";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useOrderbookSummary } from "@/hooks/useOrderbookSummary";
import { useTimelineData } from "@/hooks/useTimelineData";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";
import { formatTimestamp } from "@/utils/time";

type MarketPageViewProps = {
  embedded?: boolean;
  strictLive?: boolean;
};

export function MarketPageView({ embedded = false, strictLive = true }: MarketPageViewProps) {
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const selectedState = getSpotlightState(selectedStateCode);
  const selectedSlug = selectedState?.liveMarketSlug;
  const { featuredMarketQuery, featuredMarket: market, historicalSeriesQuery, marketSeries } = useMarketData({
    slug: selectedSlug,
    strictFeaturedMarket: strictLive
  });
  const { orderbook, snapshotQuery } = useOrderbook(market?.tokenId, {
    strictSnapshot: strictLive,
    allowMockStreamFallback: !strictLive,
    enableRealtime: strictLive
  });
  const orderbookSummaryQuery = useOrderbookSummary(market?.tokenId);
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
          (strictLive
            ? "The live market page is configured to use real data only, and no usable live response was available."
            : "The embedded market module could not load even the fallback data.")
        }
      />
    );
  }

  const content = (
    <>
      <section>
        <p className="metric-label">Interactive Map</p>
        {/* The title row mirrors the UsMarketMap grid columns so the timestamp sits at
            the right edge of the map column (not the full content width). */}
        <div className="mt-2 grid gap-x-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)] xl:grid-cols-[3fr_1fr]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <h2 className="max-w-4xl text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
              {market.outcomeLabel ?? market.title}
            </h2>
            <p className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
              {formatTimestamp(orderbook.updatedAt, "MMM d, HH:mm:ss")}
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:leading-7">
          The map is now the primary navigation surface. Click a state to zoom in and move the current live market
          context into the right-side rail.
        </p>
        <div className="mt-6">
          <UsMarketMap
            market={market}
            orderbook={orderbook}
            orderbookSummary={orderbookSummaryQuery.data}
            selectedCode={selectedStateCode}
            onSelectCode={setSelectedStateCode}
            sources={{
              featuredMarket: sources["featured-market"],
              orderbookSummary: sources["orderbook-summary"],
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
            <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Republican win probability over time</h2>
          </div>
          <p className="text-sm leading-6 text-slate-500 md:max-w-[280px] md:text-right">
            {historicalSeriesQuery.isLoading
              ? "Loading history..."
              : `${marketSeries.length} points · ${sources["price-history"]?.state ?? "fallback"} · ${sources["price-history"]?.mode ?? "mock"}`}
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:leading-7">
          The line tracks Polymarket&rsquo;s implied probability that the Republican candidate wins, sourced from live
          contract history when available and the local fallback series otherwise. Each value is the last traded price of
          the &ldquo;Republican&rdquo; outcome — 50% means the market sees the race as a coin flip, while moves above
          imply the GOP is favored. Annotations call out polling shifts, campaign events, and macro releases that
          repriced the contract.
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
