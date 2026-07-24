"use client";

import { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import usAtlas from "us-atlas/states-10m.json";
import ukRegions from "@/components/maps/data/uk-regions.json";
import { DepthChart } from "@/components/charts/DepthChart";
import { summarizeMarketMovement } from "@/analytics/marketMovement";
import { AbnormalActivityFeed } from "@/components/maps/AbnormalActivityFeed";
import type {
  ActivitySignalFilter,
  ActivityTimeWindow,
  MapViewMode
} from "@/components/maps/activityFeedFilters";
import {
  getMarketSignalColor,
  getMarketSignalLabel,
  getMarketSignalSeverity,
  SIGNAL_LEGEND
} from "@/components/maps/marketSignals";
import {
  COUNTRY_MARKET_MAPS,
  getCountryMarketMaps,
  getRegionMarketPairLabel,
  getRegionMarketsByCountry,
  getSpotlightState,
  inferSpotlightCodeFromMarket,
  marketMatchesRegion
} from "@/components/maps/spotlightStates";
import type { CountryMarketMap } from "@/components/maps/spotlightStates";
import type {
  LiveMicrostructureMetrics,
  LiveReplay,
  MarketSnapshot,
  OrderbookState,
  OrderbookSummary,
  TimePoint
} from "@/types/market";
import type { RegionSignal } from "@/types/signals";
import { formatTimestamp, relativeTime } from "@/utils/time";
import { useSignalWatchlist } from "@/hooks/useSignalWatchlist";

function formatWalletAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCompactCurrency(value?: number) {
  if (value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatMovement(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)} pts`;
}

function movementTone(value: number | null) {
  if (value === null || value === 0) {
    return "text-slate-500";
  }
  return value > 0 ? "text-emerald-700" : "text-rose-700";
}

function formatContractClose(value?: string) {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return `Closes ${new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date)}`;
}

type UsMarketMapProps = {
  market: MarketSnapshot;
  orderbook: OrderbookState;
  orderbookSummary?: OrderbookSummary | null;
  liveMicrostructure?: LiveMicrostructureMetrics | null;
  liveReplay?: LiveReplay | null;
  marketSeries?: TimePoint[];
  selectedCode?: string | null;
  selectedCountryCode?: string;
  regionSignals?: RegionSignal[];
  activityThreshold?: number;
  activitySignalKind?: ActivitySignalFilter;
  activityMaxAgeHours?: ActivityTimeWindow;
  mapView?: MapViewMode;
  onActivityThresholdChange?: (score: number) => void;
  onActivitySignalKindChange?: (kind: ActivitySignalFilter) => void;
  onActivityMaxAgeHoursChange?: (hours: ActivityTimeWindow) => void;
  onMapViewChange?: (view: MapViewMode) => void;
  onSelectCode?: (code: string | null) => void;
  onSelectCountryCode?: (code: string) => void;
};

export function UsMarketMap({
  market,
  orderbook,
  orderbookSummary,
  liveMicrostructure,
  liveReplay,
  marketSeries = [],
  selectedCode,
  selectedCountryCode = "US",
  regionSignals = [],
  activityThreshold = 50,
  activitySignalKind = "all",
  activityMaxAgeHours = 0,
  mapView = "country",
  onActivityThresholdChange,
  onActivitySignalKindChange,
  onActivityMaxAgeHoursChange,
  onMapViewChange,
  onSelectCode,
  onSelectCountryCode
}: UsMarketMapProps) {
  const defaultCode = useMemo(() => inferSpotlightCodeFromMarket(market), [market]);
  const availableCountries = useMemo(() => getCountryMarketMaps(), []);
  const activeCountry = COUNTRY_MARKET_MAPS.find((country) => country.code === selectedCountryCode) ?? COUNTRY_MARKET_MAPS[0];
  const regionMarkets = useMemo(() => getRegionMarketsByCountry(activeCountry.code), [activeCountry.code]);
  const regionByFeatureId = useMemo(
    () => new Map(regionMarkets.map((region) => [region.featureId, region])),
    [regionMarkets]
  );
  const signalByRegion = useMemo(
    () => new Map(regionSignals.map((signal) => [signal.regionCode, signal])),
    [regionSignals]
  );
  const countrySummaries = useMemo(
    () =>
      availableCountries.map((country) => {
        const regions = getRegionMarketsByCountry(country.code);
        const topRegion = regions
          .map((region) => ({
            region,
            signal: signalByRegion.get(region.code) ?? region.signal
          }))
          .sort((left, right) => right.signal.score - left.signal.score)[0];

        return {
          country,
          regions,
          topRegion
        };
      }),
    [availableCountries, signalByRegion]
  );
  const labeledRegions = useMemo(
    () =>
      regionMarkets
        .map((region) => ({
          region,
          signal: signalByRegion.get(region.code) ?? region.signal
        }))
        .filter(({ signal }) => signal.score >= 70)
        .sort((left, right) => right.signal.score - left.signal.score)
        .slice(0, 3),
    [regionMarkets, signalByRegion]
  );
  const alertSignals = useMemo(
    () =>
      regionSignals.map((signal) => {
        const region = regionMarkets.find(
          (candidate) => candidate.code === signal.regionCode
        );
        return {
          countryCode: signal.countryCode,
          regionCode: signal.regionCode,
          regionLabel: region?.label ?? signal.regionCode,
          pairLabel: region
            ? getRegionMarketPairLabel(region)
            : signal.marketSlug,
          headline: signal.headline,
          score: signal.score,
          observedAt: signal.observedAt,
          source: signal.source
        };
      }),
    [regionMarkets, regionSignals]
  );
  const signalWatchlist = useSignalWatchlist(alertSignals);
  const [localSelectedCode, setLocalSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const activeSelectedCode = selectedCode ?? localSelectedCode;

  useEffect(() => {
    if (!onSelectCode) {
      setLocalSelectedCode(null);
    }
  }, [defaultCode, onSelectCode]);

  const selectCode = (code: string | null) => {
    if (onSelectCode) {
      onSelectCode(code);
      return;
    }
    setLocalSelectedCode(code);
  };

  useEffect(() => {
    if (selectedCode === undefined) {
      return;
    }

    setLocalSelectedCode(selectedCode);
  }, [selectedCode]);

  const selectedState = getSpotlightState(activeSelectedCode);
  const defaultRegion = getSpotlightState(defaultCode);
  const activeRegion =
    selectedState?.countryCode === activeCountry.code
      ? selectedState
      : defaultRegion?.countryCode === activeCountry.code
        ? defaultRegion
        : null;

  const compactTitle = market.title.length > 56 ? `${market.title.slice(0, 56)}...` : market.title;

  const summary = orderbookSummary ?? {
    bestBid: orderbook.bids[0]?.price ?? 0,
    bestAsk: orderbook.asks[0]?.price ?? 0,
    midPrice: orderbook.midPrice,
    bidLevels: orderbook.bids.length,
    askLevels: orderbook.asks.length,
    tradeCount: orderbook.trades.length,
    liquidity: {
      totalBidDepth: orderbook.bids.reduce((sum, level) => sum + level.size, 0),
      totalAskDepth: orderbook.asks.reduce((sum, level) => sum + level.size, 0),
      imbalance: 0,
      spreadBps: orderbook.midPrice === 0 ? 0 : Number(((orderbook.spread / orderbook.midPrice) * 10_000).toFixed(1))
    },
    tradePressure: {
      buyVolume: 0,
      sellVolume: 0,
      ratio: 0,
      pressure: "balanced" as const
    },
    whaleActivity: {
      status: "insufficient-data" as const,
      sampleSize: orderbook.trades.length,
      medianTradeSize: 0,
      historicalMultipleThreshold: 3,
      depthShareThreshold: 0.05,
      minimumSampleSize: 5,
      attributionAvailable: false,
      attributedTradeCount: 0,
      uniqueWalletCount: 0,
      walletSampleMinimum: 10,
      walletConcentrationStatus: "unavailable" as const,
      walletConcentrationScore: null,
      topWalletVolumeShare: null,
      walletReputationStatus: "unavailable" as const,
      walletReputationScore: null,
      walletResolvedMarketCount: 0,
      walletResolvedMarketMinimum: 5,
      largeTrades: []
    }
  };
  summary.liquidity.imbalance =
    summary.liquidity.totalBidDepth + summary.liquidity.totalAskDepth === 0
      ? 0
      : Number(
          (
            (summary.liquidity.totalBidDepth - summary.liquidity.totalAskDepth) /
            (summary.liquidity.totalBidDepth + summary.liquidity.totalAskDepth)
          ).toFixed(3)
        );
  const whaleActivity = summary.whaleActivity ?? {
    status: "insufficient-data" as const,
    sampleSize: orderbook.trades.length,
    medianTradeSize: 0,
    historicalMultipleThreshold: 3,
    depthShareThreshold: 0.05,
    minimumSampleSize: 5,
    attributionAvailable: false,
    attributedTradeCount: 0,
    uniqueWalletCount: 0,
    walletSampleMinimum: 10,
    walletConcentrationStatus: "unavailable" as const,
    walletConcentrationScore: null,
    topWalletVolumeShare: null,
    walletReputationStatus: "unavailable" as const,
    walletReputationScore: null,
    walletResolvedMarketCount: 0,
    walletResolvedMarketMinimum: 5,
    largeTrades: []
  };

  const fallbackMicrostructure: LiveMicrostructureMetrics = {
    microprice: summary.midPrice,
    depthSkew: summary.liquidity.imbalance,
    realizedVolatility: 0,
    tradeIntensity:
      summary.tradeCount > 0
        ? Number(((summary.tradePressure.buyVolume + summary.tradePressure.sellVolume) / summary.tradeCount).toFixed(4))
        : 0,
    orderFlowImbalance:
      summary.tradePressure.buyVolume + summary.tradePressure.sellVolume === 0
        ? 0
        : Number(
            (
              (summary.tradePressure.buyVolume - summary.tradePressure.sellVolume) /
              (summary.tradePressure.buyVolume + summary.tradePressure.sellVolume)
            ).toFixed(3)
          )
  };
  const microstructure = liveMicrostructure ?? fallbackMicrostructure;
  const showingBackendMetrics = Boolean(liveMicrostructure);
  const marketMovement = useMemo(
    () => summarizeMarketMovement(marketSeries, market.probability),
    [market.probability, marketSeries]
  );
  const selectedRegionHasPair = Boolean(activeRegion?.liveMarketSlug);
  const activeSignal = activeRegion ? signalByRegion.get(activeRegion.code) ?? activeRegion.signal : null;
  const marketMatchesActiveRegion = Boolean(activeRegion) && marketMatchesRegion(activeRegion, market);
  const activePairLabel =
    activeRegion && marketMatchesActiveRegion
      ? compactTitle
      : activeRegion
        ? getRegionMarketPairLabel(activeRegion)
        : compactTitle;
  const activeRegionWatched = activeRegion
    ? signalWatchlist.watchlist.includes(`${activeCountry.code}:${activeRegion.code}`)
    : false;
  const liveVenueUrl = marketMatchesActiveRegion
    ? `https://polymarket.com/event/${market.eventSlug ?? market.slug}`
    : null;
  const marketCloseLabel = formatContractClose(market.endDate);
  const highPriorityCount = regionMarkets.filter(
    (region) => (signalByRegion.get(region.code) ?? region.signal).score >= 70
  ).length;
  const hoveredRegion = getSpotlightState(hoveredCode);
  const hoveredSignal = hoveredRegion
    ? signalByRegion.get(hoveredRegion.code) ?? hoveredRegion.signal
    : null;

  const getRegionFill = (regionCode?: string) => {
    const region = getSpotlightState(regionCode);
    const signal = region ? signalByRegion.get(region.code) ?? region.signal : null;
    return getMarketSignalColor(signal?.score);
  };

  const selectCountry = (country: CountryMarketMap) => {
    onSelectCountryCode?.(country.code);
    selectCode(country.defaultRegionCode);
    onMapViewChange?.("country");
  };

  if (mapView === "world") {
    const activeMarketCount = countrySummaries.reduce(
      (total, summary) => total + summary.regions.length,
      0
    );

    return (
      <section aria-labelledby="global-map-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="metric-label">Global Overview</p>
            <h3 id="global-map-title" className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
              Select a country
            </h3>
          </div>
          <p className="font-sans text-xs text-slate-500">
            {availableCountries.length} supported countries · {activeMarketCount} active markets
          </p>
        </div>

        <div className="mt-7 grid gap-10 lg:grid-cols-2">
          {countrySummaries.map(({ country, regions, topRegion }) => {
            const regionById = new Map(regions.map((region) => [region.featureId, region]));
            const geography = country.code === "US" ? usAtlas : ukRegions;

            return (
              <button
                key={country.code}
                type="button"
                onClick={() => selectCountry(country)}
                className="group min-w-0 text-left"
                aria-label={`Open ${country.label} political markets`}
              >
                <div className="relative aspect-[5/3] overflow-hidden bg-slate-50/60">
                  <ComposableMap
                    projection={country.projection}
                    projectionConfig={
                      country.projectionScale
                        ? {
                            center: country.defaultCenter,
                            scale: country.projectionScale
                          }
                        : undefined
                    }
                    width={600}
                    height={360}
                    className="h-full w-full transition-transform duration-200 group-hover:scale-[1.015]"
                    aria-hidden="true"
                  >
                    <ZoomableGroup center={country.defaultCenter} zoom={country.defaultZoom}>
                      <Geographies geography={geography}>
                        {({ geographies }) =>
                          geographies.map((geo) => {
                            const featureId = country.featureIdProperty
                              ? String(geo.properties?.[country.featureIdProperty] ?? "")
                              : String(geo.id).padStart(2, "0");
                            const region = regionById.get(featureId);

                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                tabIndex={-1}
                                style={{
                                  default: {
                                    fill: getRegionFill(region?.code),
                                    outline: "none",
                                    stroke: "#ffffff",
                                    strokeWidth: 0.8
                                  },
                                  hover: {
                                    fill: getRegionFill(region?.code),
                                    outline: "none",
                                    stroke: "#ffffff",
                                    strokeWidth: 0.8
                                  },
                                  pressed: {
                                    fill: getRegionFill(region?.code),
                                    outline: "none",
                                    stroke: "#ffffff",
                                    strokeWidth: 0.8
                                  }
                                }}
                              />
                            );
                          })
                        }
                      </Geographies>
                    </ZoomableGroup>
                  </ComposableMap>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{country.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {regions.length} markets · Top signal {topRegion?.region.label ?? "Unavailable"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums text-slate-900">
                      {topRegion?.signal.score ?? 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {getMarketSignalSeverity(topRegion?.signal.score)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
          <span className="font-medium text-slate-900">Activity score</span>
          {SIGNAL_LEGEND.map((item) => (
            <span key={item.severity} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: getMarketSignalColor(
                    item.severity === "critical"
                      ? 85
                      : item.severity === "high"
                        ? 70
                        : item.severity === "elevated"
                          ? 50
                          : 0
                  )
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)] lg:items-start xl:grid-cols-[3fr_1fr]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-xs font-medium text-slate-600">
            {regionMarkets.length} active markets · {highPriorityCount} high priority
            {activeRegion ? ` · Focus ${activeRegion.label}` : ""}
          </p>
          {availableCountries.length > 1 ? (
            <button
              type="button"
              onClick={() => onMapViewChange?.("world")}
              className="border border-slate-200 bg-white px-3 py-2 font-sans text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              All countries
            </button>
          ) : null}
        </div>

        <div className="grid items-stretch gap-6">
          <div className="relative order-2 overflow-hidden rounded-lg lg:order-1" style={{ border: "1.5px solid var(--demo-card-bg)" }}>
            <ComposableMap
              projection={activeCountry.projection}
              projectionConfig={
                activeCountry.projectionScale
                  ? {
                      center: activeCountry.defaultCenter,
                      scale: activeCountry.projectionScale
                    }
                  : undefined
              }
              className="relative h-auto w-full overflow-visible"
            >
              <ZoomableGroup
                center={activeCountry.defaultCenter}
                zoom={activeCountry.defaultZoom}
                translateExtent={[
                  [0, 0],
                  [980, 620]
                ]}
              >
                <Geographies geography={activeCountry.code === "US" ? usAtlas : ukRegions}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const featureId = activeCountry.featureIdProperty
                        ? String(geo.properties?.[activeCountry.featureIdProperty] ?? "")
                        : String(geo.id).padStart(2, "0");
                      const region = regionByFeatureId.get(featureId);
                      const fill = getRegionFill(region?.code);
                      const isSelected = region?.code === activeSelectedCode;
                      const signal = region ? signalByRegion.get(region.code) ?? region.signal : null;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={region ? () => selectCode(region.code) : undefined}
                          onMouseEnter={region ? () => setHoveredCode(region.code) : undefined}
                          onMouseLeave={region ? () => setHoveredCode(null) : undefined}
                          onKeyDown={
                            region
                              ? (event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectCode(region.code);
                                  }
                                }
                              : undefined
                          }
                          aria-label={
                            region
                              ? `${region.label}: activity score ${signal?.score ?? 0}, ${getMarketSignalSeverity(signal?.score)}`
                              : undefined
                          }
                          role={region ? "button" : "presentation"}
                          tabIndex={region ? 0 : -1}
                          style={{
                            default: {
                              fill,
                              outline: "none",
                              stroke: isSelected ? "#111827" : "#ffffff",
                              strokeWidth: isSelected ? 2.2 : 0.8,
                              cursor: region ? "pointer" : "default"
                            },
                            hover: {
                              fill: region ? fill : "#d4d4d8",
                              outline: "none",
                              stroke: region ? "#111827" : "#ffffff",
                              strokeWidth: region ? 1.8 : 0.8,
                              cursor: region ? "pointer" : "default"
                            },
                            pressed: {
                              fill: "#020617",
                              outline: "none",
                              stroke: "#ffffff",
                              strokeWidth: 0.8
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                {labeledRegions.map(({ region, signal }) => (
                  <Marker key={region.code} coordinates={region.center}>
                    <g aria-hidden="true" className="pointer-events-none">
                      <circle
                        r={8}
                        fill={getMarketSignalColor(signal.score)}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <text
                        y={-14}
                        textAnchor="middle"
                        fill="#111827"
                        fontFamily="Inter, Segoe UI, sans-serif"
                        fontSize={9}
                        fontWeight={700}
                        paintOrder="stroke"
                        stroke="var(--demo-card-bg)"
                        strokeWidth={3}
                      >
                        {region.code} {signal.score}
                      </text>
                    </g>
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>
            <div
              className="pointer-events-none absolute inset-0 rounded-lg"
              aria-hidden="true"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, transparent 42%, var(--demo-card-bg) 88%)"
              }}
            />
            {hoveredRegion && hoveredSignal ? (
              <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[260px] border border-slate-200 bg-white/95 px-3 py-2 font-sans shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-900">{hoveredRegion.label}</span>
                  <span className="text-xs font-semibold tabular-nums text-slate-900">{hoveredSignal.score}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-600">
                  {getRegionMarketPairLabel(hoveredRegion)}
                </p>
              </div>
            ) : null}
          </div>
          <div className="order-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-slate-600 lg:order-2">
            <span className="font-medium text-slate-900">Activity score</span>
            {SIGNAL_LEGEND.map((item) => (
              <span key={item.severity} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: getMarketSignalColor(item.severity === "critical" ? 85 : item.severity === "high" ? 70 : item.severity === "elevated" ? 50 : 0) }}
                />
                {item.label}
              </span>
            ))}
            <a
              href={activeCountry.boundarySourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-slate-400 hover:text-slate-700"
            >
              Boundaries: {activeCountry.boundarySourceLabel} ↗
            </a>
          </div>
          <div className="order-1 lg:order-3">
            <AbnormalActivityFeed
              regions={regionMarkets}
              signals={regionSignals}
              selectedCode={activeSelectedCode ?? defaultCode}
              minimumScore={activityThreshold}
              signalKind={activitySignalKind}
              maxAgeHours={activityMaxAgeHours}
              countryCode={activeCountry.code}
              watchlist={signalWatchlist.watchlist}
              watchedOnly={signalWatchlist.watchedOnly}
              alertsEnabled={signalWatchlist.alertsEnabled}
              alertPermission={signalWatchlist.alertPermission}
              onMinimumScoreChange={onActivityThresholdChange ?? (() => undefined)}
              onSignalKindChange={onActivitySignalKindChange ?? (() => undefined)}
              onMaxAgeHoursChange={onActivityMaxAgeHoursChange ?? (() => undefined)}
              onWatchedOnlyChange={signalWatchlist.setWatchedOnly}
              onAlertsEnabledChange={(enabled) => {
                void signalWatchlist.setBrowserAlertsEnabled(enabled);
              }}
              onToggleWatch={signalWatchlist.toggleWatch}
              onSelect={selectCode}
            />
          </div>
        </div>
      </div>

      <div className="pt-4 lg:pl-2 lg:pt-0">
        <p className="metric-label">Market Overview</p>
        <h3 className="mt-2 text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
          {activeRegion?.label ?? compactTitle}
        </h3>
        {activeRegion ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {activeRegion.countryLabel} · {activeRegion.note}
          </p>
        ) : null}

        {marketMatchesActiveRegion ? (
          <div className="mt-6 font-sans">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Probability</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                  {(market.probability * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">24h volume</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                  {formatCompactCurrency(market.volume24h)}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-4 gap-3">
              {([
                ["1h", marketMovement.oneHour],
                ["24h", marketMovement.twentyFourHours],
                ["7d", marketMovement.sevenDays]
              ] satisfies Array<[string, number | null]>).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                  <dd className={`mt-1 text-xs font-semibold tabular-nums ${movementTone(value)}`}>
                    {formatMovement(value)}
                  </dd>
                </div>
              ))}
              <div className="text-right">
                <dt className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Liquidity</dt>
                <dd className="mt-1 text-xs font-semibold tabular-nums text-slate-900">
                  {formatCompactCurrency(market.liquidity)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 font-sans">
          {activeRegion ? (
            <button
              type="button"
              aria-pressed={activeRegionWatched}
              onClick={() => signalWatchlist.toggleWatch(activeCountry.code, activeRegion.code)}
              className={`border px-3 py-2 text-xs font-semibold transition ${
                activeRegionWatched
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:border-slate-900 hover:text-slate-900"
              }`}
            >
              {activeRegionWatched ? "Watching" : "Watch region"}
            </button>
          ) : null}
          {liveVenueUrl ? (
            <a
              href={liveVenueUrl}
              target="_blank"
              rel="noreferrer"
              className="border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Open market ↗
            </a>
          ) : null}
        </div>

        {marketMatchesActiveRegion &&
        (market.venue || marketCloseLabel || market.description || market.resolutionSource) ? (
          <div className="mt-5 font-sans text-xs leading-5 text-slate-500">
            {market.venue || marketCloseLabel ? (
              <p>
                {[
                  market.venue ? `Venue: ${market.venue}` : null,
                  marketCloseLabel
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {market.description || market.resolutionSource ? (
              <details className="mt-2">
                <summary className="w-fit cursor-pointer font-semibold text-slate-700 transition hover:text-slate-900">
                  Contract details
                </summary>
                {market.description ? (
                  <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600">
                    {market.description}
                  </p>
                ) : null}
                {market.resolutionSource ? (
                  <a
                    href={market.resolutionSource}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Resolution source ↗
                  </a>
                ) : null}
              </details>
            ) : null}
          </div>
        ) : null}

        {activeSignal ? (
          <div className="mt-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="metric-label">{getMarketSignalLabel(activeSignal)}</p>
                <p className="mt-2 font-semibold text-slate-900">{activeSignal.headline}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-slate-900">{activeSignal.score}</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {getMarketSignalSeverity(activeSignal.score)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{activeSignal.detail}</p>
            <p className="mt-2 text-xs text-slate-400">
              Updated {relativeTime(activeSignal.observedAt)}
              {activeSignal.confidence !== undefined && activeSignal.confidence > 0
                ? ` · ${Math.round(activeSignal.confidence * 100)}% confidence`
                : ""}
            </p>
          </div>
        ) : null}

        {/* Depth chart only renders once the parent grid actually has a right panel (lg+).
            Below lg, the layout collapses to a single column and stacking the depth chart
            beneath the map looks broken — so we hide it entirely in that range. */}
        {marketMatchesActiveRegion ? (
          <>
            <div className="mt-6 hidden lg:block">
              <DepthChart askColor="#9f5f71" bidColor="#5c7ea6" orderbook={orderbook} height={300} />
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <p className="metric-label">Market Snapshot</p>
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Updated {relativeTime(orderbook.updatedAt)}
                </span>
              </div>
              <div className="mt-3 divide-y divide-[var(--demo-card-divider)] text-sm">
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="text-slate-500">Mid / microprice</span>
                  <span className="font-semibold text-slate-900">
                    {summary.midPrice.toFixed(3)} / {microstructure.microprice.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="text-slate-500">Spread / depth skew</span>
                  <span className="font-semibold text-slate-900">
                    {summary.liquidity.spreadBps.toFixed(1)} bps / {(microstructure.depthSkew * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="text-slate-500">Flow / volatility</span>
                  <span className="font-semibold text-slate-900">
                    {(microstructure.orderFlowImbalance * 100).toFixed(1)}% / {microstructure.realizedVolatility.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="text-slate-500">Depth / activity</span>
                  <span className="font-semibold text-slate-900">
                    {summary.liquidity.totalBidDepth.toFixed(0)} / {summary.liquidity.totalAskDepth.toFixed(0)} · {microstructure.tradeIntensity.toFixed(1)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {showingBackendMetrics
                  ? "Calculated from recent market activity."
                  : "Estimated from the latest available order book."}
              </p>
            </div>

            <div className="mt-8">
              <div className="flex items-baseline justify-between gap-3">
                <p className="metric-label">Large Trade Monitor</p>
                <span className="text-xs tabular-nums text-slate-500">
                  {whaleActivity.sampleSize} prints
                </span>
              </div>
              {whaleActivity.status === "detected" ? (
                <div className="mt-3 divide-y divide-[var(--demo-card-divider)]">
                  {whaleActivity.largeTrades.slice(0, 3).map((trade) => (
                    <div
                      key={trade.tradeId}
                      className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 py-2.5 text-sm"
                    >
                      <span
                        className={`font-semibold uppercase ${
                          trade.side === "buy" ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {trade.side}
                      </span>
                      <span className="text-slate-600">
                        {trade.historicalSizeMultiple.toFixed(1)}x median ·{" "}
                        {(trade.executableDepthShare * 100).toFixed(1)}% depth
                        {trade.walletAddress ? ` · ${formatWalletAddress(trade.walletAddress)}` : ""}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        ${trade.notionalUsd.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {whaleActivity.status === "clear"
                    ? "No recent print meets both relative thresholds."
                    : whaleActivity.sampleSize >= whaleActivity.minimumSampleSize
                    ? "There is not enough recent trade data to assess large-trade activity."
                      : `At least ${whaleActivity.minimumSampleSize} normalized prints and two-sided depth are required.`}
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {whaleActivity.walletConcentrationStatus === "available" &&
                whaleActivity.walletConcentrationScore !== null &&
                whaleActivity.topWalletVolumeShare !== null
                  ? `Wallet concentration ${whaleActivity.walletConcentrationScore.toFixed(1)}/100 · top public wallet ${(
                      whaleActivity.topWalletVolumeShare * 100
                    ).toFixed(1)}% · ${whaleActivity.uniqueWalletCount} wallets · ${
                      whaleActivity.attributedTradeCount
                    } attributed prints`
                  : whaleActivity.walletConcentrationStatus === "insufficient-data"
                    ? `${whaleActivity.attributedTradeCount} attributed prints · ${whaleActivity.walletSampleMinimum} required for concentration scoring`
                    : "Public wallet attribution is unavailable for this sample."}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {whaleActivity.walletReputationStatus === "available" &&
                whaleActivity.walletReputationScore !== null
                  ? `Resolved-history score ${whaleActivity.walletReputationScore.toFixed(1)}/100 · ${whaleActivity.walletResolvedMarketCount} resolved markets`
                  : whaleActivity.walletReputationStatus === "insufficient-history"
                    ? `Resolved history ${whaleActivity.walletResolvedMarketCount}/${whaleActivity.walletResolvedMarketMinimum} markets · score withheld`
                    : `Wallet reputation unavailable · ${whaleActivity.walletResolvedMarketCount} resolved markets`}
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Flagged at {whaleActivity.historicalMultipleThreshold}x median size and{" "}
                {(whaleActivity.depthShareThreshold * 100).toFixed(0)}% of executable depth. Public trades do not
                establish wallet identity or insider activity.
              </p>
            </div>
          </>
        ) : (
          <div className="mt-7 border-l-2 border-amber-400 bg-amber-50 py-3 pl-4">
            <p className="font-sans text-xs font-semibold uppercase text-amber-900">Coverage unavailable</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Pair-specific depth, trades, and wallet metrics are not available for the selected region.
            </p>
          </div>
        )}

        {selectedRegionHasPair && marketMatchesActiveRegion ? (
          <p className="mt-5 text-sm text-slate-600">
            Pair: <span className="font-medium text-slate-900">{activePairLabel}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
