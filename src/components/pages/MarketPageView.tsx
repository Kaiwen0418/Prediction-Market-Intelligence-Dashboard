"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { PolymarketHistoryChart } from "@/components/charts/PolymarketHistoryChart";
import { MicrostructureReplayChart } from "@/components/charts/MicrostructureReplayChart";
import { ErrorState } from "@/components/layout/ErrorState";
import { LoadingState } from "@/components/layout/LoadingState";
import { OperationalNotice } from "@/components/layout/OperationalNotice";
import {
  parseActivityFeedFilters,
  serializeActivityFeedFilters
} from "@/components/maps/activityFeedFilters";
import type {
  ActivityCountryScope,
  ActivitySignalFilter,
  ActivityTimeWindow,
  MapViewMode
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
  const [mapView, setMapView] = useState<MapViewMode>("world");
  const [countryScope, setCountryScope] = useState<ActivityCountryScope>("global");
  const [evidenceView, setEvidenceView] = useState<"flow" | "history">("flow");
  const [activityThreshold, setActivityThreshold] = useState(50);
  const [activitySignalKind, setActivitySignalKind] = useState<ActivitySignalFilter>("all");
  const [activityMaxAgeHours, setActivityMaxAgeHours] = useState<ActivityTimeWindow>(0);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [autoTourEnabled, setAutoTourEnabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parsed = parseActivityFeedFilters(params);
    const country =
      COUNTRY_MARKET_MAPS.find((candidate) => candidate.code === parsed.countryCode) ??
      COUNTRY_MARKET_MAPS[0];
    const region = getSpotlightState(parsed.regionCode);

    setSelectedCountryCode(country.code);
    setMapView(parsed.mapView);
    setCountryScope(parsed.countryScope);
    setSelectedStateCode(
      region?.countryCode === country.code ? region.code : country.defaultRegionCode
    );
    setActivityThreshold(parsed.minimumScore);
    setActivitySignalKind(parsed.signalKind);
    setActivityMaxAgeHours(parsed.maxAgeHours);
    setAutoTourEnabled(
      !["country", "region", "view"].some((key) => params.has(key))
    );
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    const params = serializeActivityFeedFilters(
      {
        mapView,
        countryScope,
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
    countryScope,
    filtersHydrated,
    mapView,
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
  const effectiveEvidenceView =
    market?.status === "closed" ? "history" : evidenceView;
  const displayMarketTitle =
    mapView === "world"
      ? "Global political market activity"
      : selectedState && !marketMatchesSelectedRegion
      ? getRegionMarketPairLabel(selectedState)
      : market?.outcomeLabel ?? market?.title;
  const primarySource = sources["market-context"] ?? sources["featured-market"];
  const signalSource = sources["region-signals"];
  const operationalNotice =
    !marketMatchesSelectedRegion
      ? {
          tone: "warning" as const,
          title: "Limited coverage for this region",
          detail: "Regional signals remain available, but pair-specific market depth and history cannot be shown."
        }
      : market?.status === "closed"
        ? {
            tone: "info" as const,
            title: "This market is closed",
            detail: "Prices, volume, and order-book statistics are shown as historical information."
          }
        : market?.status === "inactive"
          ? {
              tone: "warning" as const,
              title: "Trading is not currently available",
              detail: "The venue is not accepting orders for this contract."
            }
      : primarySource?.state === "failed" || signalSource?.state === "failed"
        ? {
            tone: "error" as const,
            title: "Market data is temporarily unavailable",
            detail: "Some prices or signals may be missing. Please try again shortly."
          }
        : regionSignalsQuery.data?.freshness === "stale"
          ? {
              tone: "warning" as const,
              title: "Market data may be delayed",
              detail: orderbook
                ? `Last updated ${formatTimestamp(orderbook.updatedAt, "MMM d, HH:mm:ss")}.`
                : "The latest update time is unavailable."
            }
          : primarySource?.state === "fallback" || signalSource?.state === "fallback"
            ? {
                tone: "warning" as const,
                title: "Showing the latest available market information",
                detail: "Recent updates are temporarily delayed."
              }
            : primarySource?.state === "pending" || signalSource?.state === "pending"
              ? {
                  tone: "info" as const,
                  title: "Updating market information",
                  detail: "New prices and signals will appear automatically."
                }
              : null;
  const isLoading = (marketContextQuery.isLoading && !contextMarket) || featuredMarketQuery.isLoading || snapshotQuery.isLoading;
  const hasLoadError =
    Boolean(marketContextQuery.error) ||
    Boolean(featuredMarketQuery.error) ||
    Boolean(snapshotQuery.error) ||
    !market ||
    !orderbook;

  if (isLoading) {
    return <LoadingState label="Loading market data..." />;
  }

  if (hasLoadError || !market || !orderbook) {
    return (
      <ErrorState
        detail="We could not load this market. Please try again shortly."
      />
    );
  }

  const content = (
    <>
      <section>
        <div className="flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
            {displayMarketTitle}
          </h2>
          {mapView === "country" &&
          marketMatchesSelectedRegion &&
          market.status === "closed" ? (
            <span className="border border-slate-400 px-2 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Closed market
            </span>
          ) : null}
        </div>
        {mapView === "country" ? (
          <>
            <p className="mt-3 font-sans text-xs text-slate-500">
              Updated {formatTimestamp(orderbook.updatedAt, "MMM d, HH:mm:ss")}
            </p>
            {operationalNotice ? (
              <div className="mt-4 max-w-2xl">
                <OperationalNotice {...operationalNotice} />
              </div>
            ) : null}
          </>
        ) : null}
        <div className="mt-7">
          <UsMarketMap
            market={market}
            orderbook={orderbook}
            orderbookSummary={resolvedOrderbookSummary}
            liveMicrostructure={liveMicrostructure}
            liveReplay={liveReplay}
            marketSeries={marketSeries}
            regionSignals={regionSignalsQuery.data?.signals}
            activityThreshold={activityThreshold}
            autoTourEnabled={autoTourEnabled}
            countryScope={countryScope}
            activitySignalKind={activitySignalKind}
            activityMaxAgeHours={activityMaxAgeHours}
            mapView={mapView}
            selectedCountryCode={selectedCountryCode}
            selectedCode={selectedStateCode}
            onSelectCountryCode={setSelectedCountryCode}
            onSelectCode={setSelectedStateCode}
            onActivityThresholdChange={setActivityThreshold}
            onAutoTourEnabledChange={setAutoTourEnabled}
            onCountryScopeChange={setCountryScope}
            onActivitySignalKindChange={setActivitySignalKind}
            onActivityMaxAgeHoursChange={setActivityMaxAgeHours}
            onMapViewChange={setMapView}
          />
        </div>
      </section>

      {mapView === "world" ? null : marketMatchesSelectedRegion ? (
      <section className="pt-2">
        <div className="mb-7 flex border-b border-[var(--demo-card-divider)] font-sans" role="tablist" aria-label="Market evidence">
          {market.status === "closed" ? null : (
            <button
              type="button"
              role="tab"
              aria-selected={effectiveEvidenceView === "flow"}
              onClick={() => setEvidenceView("flow")}
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${
                effectiveEvidenceView === "flow"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Order flow
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={effectiveEvidenceView === "history"}
            onClick={() => setEvidenceView("history")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              effectiveEvidenceView === "history"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Price history
          </button>
        </div>

        {effectiveEvidenceView === "flow" ? (
          <div role="tabpanel">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="metric-label">Market Dynamics</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  Liquidity and order flow through time
                </h2>
              </div>
              <p className="text-sm leading-6 text-slate-500 md:max-w-[320px] md:text-right">
                {liveReplay?.sampleCount
                  ? `${liveReplay.sampleCount} recent observations`
                  : "Collecting recent market activity"}
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
                  {market.status === "closed"
                    ? "Final contract probability over time"
                    : "Selected market probability over time"}
                </h2>
              </div>
              <p className="text-sm leading-6 text-slate-500 md:max-w-[280px] md:text-right">
                {historicalSeriesQuery.isLoading
                  ? "Loading history..."
                  : `${historyMeta?.points ?? marketSeries.length} historical observations`}
              </p>
            </div>
            <div className="mt-6">
              <PolymarketHistoryChart events={deferredEvents} series={marketSeries} />
            </div>
          </div>
        )}
      </section>
      ) : (
        <section className="py-8">
          <p className="metric-label">Market Evidence</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Coverage unavailable for this pair</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Regional signals remain visible, but order-book replay and price history are unavailable because this
            region does not have matching market coverage.
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
