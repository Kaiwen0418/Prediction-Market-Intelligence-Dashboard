"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { PolymarketHistoryChart } from "@/components/charts/PolymarketHistoryChart";
import { MicrostructureReplayChart } from "@/components/charts/MicrostructureReplayChart";
import { ErrorState } from "@/components/layout/ErrorState";
import { LoadingState } from "@/components/layout/LoadingState";
import {
  parseActivityFeedFilters,
  serializeActivityFeedFilters
} from "@/components/maps/activityFeedFilters";
import type {
  ActivitySignalFilter,
  ActivityTimeWindow
} from "@/components/maps/activityFeedFilters";
import {
  COUNTRY_MARKET_MAPS,
  getRegionMarketPairLabel,
  getSpotlightState,
  marketMatchesRegion
} from "@/components/maps/spotlightStates";
import { UsMarketMap } from "@/components/maps/UsMarketMap";
import { TopNav } from "@/components/navigation/TopNav";
import { useMarketContext } from "@/hooks/useMarketContext";
import { useMarketData } from "@/hooks/useMarketData";
import { useLiveReplay } from "@/hooks/useLiveReplay";
import { useLiveSystemHealth } from "@/hooks/useLiveSystemHealth";
import { useLiveMarketStream } from "@/hooks/useLiveMarketStream";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useOrderbookSummary } from "@/hooks/useOrderbookSummary";
import { useRegionSignals } from "@/hooks/useRegionSignals";
import { useTimelineData } from "@/hooks/useTimelineData";
import { useSourceDiagnostics } from "@/hooks/useSourceDiagnostics";
import { formatTimestamp } from "@/utils/time";

type MarketPageViewProps = {
  embedded?: boolean;
  strictLive?: boolean;
};

export function MarketPageView({ embedded = false, strictLive = true }: MarketPageViewProps) {
  const [selectedCountryCode, setSelectedCountryCode] = useState("US");
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>("CA");
  const [evidenceView, setEvidenceView] = useState<"flow" | "history">("flow");
  const [activityThreshold, setActivityThreshold] = useState(50);
  const [activitySignalKind, setActivitySignalKind] = useState<ActivitySignalFilter>("all");
  const [activityMaxAgeHours, setActivityMaxAgeHours] = useState<ActivityTimeWindow>(0);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  useEffect(() => {
    const parsed = parseActivityFeedFilters(window.location.search);
    const country =
      COUNTRY_MARKET_MAPS.find((candidate) => candidate.code === parsed.countryCode) ??
      COUNTRY_MARKET_MAPS[0];
    const region = getSpotlightState(parsed.regionCode);

    setSelectedCountryCode(country.code);
    setSelectedStateCode(
      region?.countryCode === country.code ? region.code : country.defaultRegionCode
    );
    setActivityThreshold(parsed.minimumScore);
    setActivitySignalKind(parsed.signalKind);
    setActivityMaxAgeHours(parsed.maxAgeHours);
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    const params = serializeActivityFeedFilters(
      {
        countryCode: selectedCountryCode,
        regionCode: selectedStateCode,
        minimumScore: activityThreshold,
        signalKind: activitySignalKind,
        maxAgeHours: activityMaxAgeHours
      },
      window.location.search
    );
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [
    activityMaxAgeHours,
    activitySignalKind,
    activityThreshold,
    filtersHydrated,
    selectedCountryCode,
    selectedStateCode
  ]);

  const selectedState = getSpotlightState(selectedStateCode);
  const selectedSlug = selectedState?.liveMarketSlug;
  const marketContextQuery = useMarketContext(selectedSlug);
  const contextMarket = marketContextQuery.data?.featuredMarket ?? null;
  const { featuredMarketQuery, featuredMarket: market, historicalSeriesQuery, marketSeries } = useMarketData({
    slug: selectedSlug,
    strictFeaturedMarket: strictLive,
    initialFeaturedMarket: contextMarket
  });
  const { orderbook, snapshotQuery } = useOrderbook(market?.tokenId, {
    conditionId: market?.conditionId,
    strictSnapshot: strictLive,
    allowMockStreamFallback: !strictLive,
    enableRealtime: strictLive
  });
  const liveStream = useLiveMarketStream(selectedSlug ?? market?.slug);
  const liveReplayQuery = useLiveReplay(selectedSlug ?? market?.slug, 48);
  const regionSignalsQuery = useRegionSignals(selectedCountryCode, selectedSlug ?? market?.slug);
  const liveSystemHealth = useLiveSystemHealth();
  const orderbookSummaryQuery = useOrderbookSummary(market?.tokenId, market?.conditionId);
  const sources = useSourceDiagnostics();
  const timelineQuery = useTimelineData(market, marketContextQuery.data?.timelineEvents);
  const deferredEvents = useDeferredValue(timelineQuery.data ?? []);
  const liveStreamMatchesMarket =
    Boolean(liveStream.snapshot?.orderbookSummary) &&
    Boolean(market?.slug) &&
    liveStream.snapshot?.status.marketSlug === (selectedSlug ?? market?.slug);
  const streamedOrderbookSummary = liveStreamMatchesMarket
    ? liveStream.snapshot?.orderbookSummary
    : null;
  const restOrderbookSummary =
    marketContextQuery.data?.orderbookSummary ?? orderbookSummaryQuery.data;
  const resolvedOrderbookSummary = streamedOrderbookSummary
    ? {
        ...streamedOrderbookSummary,
        whaleActivity:
          restOrderbookSummary?.whaleActivity ??
          streamedOrderbookSummary.whaleActivity
      }
    : restOrderbookSummary;
  const liveMicrostructure = liveStreamMatchesMarket ? liveStream.snapshot?.microstructure ?? null : null;
  const liveReplay =
    liveReplayQuery.data && liveReplayQuery.data.status.marketSlug === (selectedSlug ?? market?.slug)
      ? liveReplayQuery.data
      : null;
  const historyMeta = marketContextQuery.data?.priceHistoryMeta;
  const marketMatchesSelectedRegion = marketMatchesRegion(selectedState, market);
  const displayMarketTitle =
    selectedState && !marketMatchesSelectedRegion
      ? getRegionMarketPairLabel(selectedState)
      : market?.outcomeLabel ?? market?.title;
  const primarySource = sources["market-context"] ?? sources["featured-market"];
  const signalSource = sources["region-signals"];
  const dataState =
    !marketMatchesSelectedRegion
      ? "Coverage unavailable"
      : primarySource?.state === "failed" || signalSource?.state === "failed"
      ? "Unavailable"
      : primarySource?.state === "live" && signalSource?.state === "live"
        ? "Live"
        : primarySource?.state === "pending" || signalSource?.state === "pending"
          ? "Connecting"
          : "Fallback";
  const dataStateTone =
    dataState === "Live"
      ? "bg-emerald-500"
      : dataState === "Fallback"
        ? "bg-amber-400"
        : dataState === "Unavailable" || dataState === "Coverage unavailable"
          ? "bg-rose-500"
          : "bg-slate-300";
  const isLoading = (marketContextQuery.isLoading && !contextMarket) || featuredMarketQuery.isLoading || snapshotQuery.isLoading;
  const errorMessage = marketContextQuery.error instanceof Error
    ? marketContextQuery.error.message
    : featuredMarketQuery.error instanceof Error
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
              {displayMarketTitle}
            </h2>
            <p className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
              {formatTimestamp(orderbook.updatedAt, "MMM d, HH:mm:ss")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[var(--demo-card-divider)] py-3 font-sans text-xs text-slate-600">
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <span className={`h-2.5 w-2.5 rounded-full ${dataStateTone}`} />
            {dataState}
          </span>
          <span>Market: {primarySource?.mode ?? "pending"}</span>
          <span>Signals: {signalSource?.mode ?? "pending"}</span>
          <span>Updated {formatTimestamp(orderbook.updatedAt, "MMM d, HH:mm:ss")}</span>
        </div>
        <div className="mt-5">
          <UsMarketMap
            market={market}
            orderbook={orderbook}
            orderbookSummary={resolvedOrderbookSummary}
            liveMicrostructure={liveMicrostructure}
            liveReplay={liveReplay}
            regionSignals={regionSignalsQuery.data?.signals}
            activityThreshold={activityThreshold}
            activitySignalKind={activitySignalKind}
            activityMaxAgeHours={activityMaxAgeHours}
            selectedCountryCode={selectedCountryCode}
            selectedCode={selectedStateCode}
            onSelectCountryCode={setSelectedCountryCode}
            onSelectCode={setSelectedStateCode}
            onActivityThresholdChange={setActivityThreshold}
            onActivitySignalKindChange={setActivitySignalKind}
            onActivityMaxAgeHoursChange={setActivityMaxAgeHours}
            sources={{
              featuredMarket: sources["market-context"] ?? sources["featured-market"],
              liveStream: sources["live-stream"],
              liveReplay: sources["live-replay"],
              liveReadiness: sources["live-readiness"],
              liveDegradation: sources["live-degradation"],
              liveRegistry: sources["live-registry"],
              orderbookSummary: sources["market-context"] ?? sources["orderbook-summary"],
              regionSignals: sources["region-signals"],
              orderbook: sources.orderbook,
              trades: sources.trades
            }}
            liveReadiness={liveSystemHealth.readinessQuery.data ?? null}
            liveDegradation={liveSystemHealth.degradationQuery.data ?? null}
            liveRegistryHealth={liveSystemHealth.registryHealthQuery.data ?? null}
          />
        </div>
      </section>

      {marketMatchesSelectedRegion ? (
      <section className="border-t border-[var(--demo-card-divider)] pt-8">
        <div className="mb-7 flex border-b border-[var(--demo-card-divider)] font-sans" role="tablist" aria-label="Market evidence">
          <button
            type="button"
            role="tab"
            aria-selected={evidenceView === "flow"}
            onClick={() => setEvidenceView("flow")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              evidenceView === "flow"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Order flow
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={evidenceView === "history"}
            onClick={() => setEvidenceView("history")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              evidenceView === "history"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Price history
          </button>
        </div>

        {evidenceView === "flow" ? (
          <div role="tabpanel">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="metric-label">Microstructure Replay</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  Liquidity and order flow through time
                </h2>
              </div>
              <p className="text-sm leading-6 text-slate-500 md:max-w-[320px] md:text-right">
                {liveReplay?.sampleCount ?? 0} samples · {liveReplay?.source ?? "warming up"} · FastAPI + NumPy
              </p>
            </div>
            <div className="mt-6">
              <MicrostructureReplayChart samples={liveReplay?.samples ?? []} />
            </div>
          </div>
        ) : (
          <div role="tabpanel">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="metric-label">Price History</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  Selected market probability over time
                </h2>
              </div>
              <p className="text-sm leading-6 text-slate-500 md:max-w-[280px] md:text-right">
                {historicalSeriesQuery.isLoading
                  ? "Loading history..."
                  : `${historyMeta?.points ?? marketSeries.length} points · ${sources["market-context"]?.state ?? sources["price-history"]?.state ?? "fallback"} · ${sources["market-context"]?.mode ?? sources["price-history"]?.mode ?? "mock"}`}
              </p>
            </div>
            <div className="mt-6">
              <PolymarketHistoryChart events={deferredEvents} series={marketSeries} />
            </div>
          </div>
        )}
      </section>
      ) : (
        <section className="border-t border-[var(--demo-card-divider)] py-10">
          <p className="metric-label">Market Evidence</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Coverage unavailable for this pair</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Signal context remains visible, but order-book replay and price history are withheld because the loaded
            fallback market does not match the selected region.
          </p>
        </section>
      )}
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
