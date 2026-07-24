"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import usAtlas from "us-atlas/states-10m.json";
import franceRegions from "@/components/maps/data/france-regions.json";
import germanyStates from "@/components/maps/data/germany-states.json";
import ukRegions from "@/components/maps/data/uk-regions.json";
import worldCountries from "@/components/maps/data/world-countries-110m.json";
import { DepthChart } from "@/components/charts/DepthChart";
import { summarizeMarketMovement } from "@/analytics/marketMovement";
import { AbnormalActivityFeed } from "@/components/maps/AbnormalActivityFeed";
import type {
  ActivityCountryScope,
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
import { getAutoTourRegions } from "@/components/maps/mapTour";
import {
  MAP_CAMERA_SETTLE_MS,
  MAP_CAMERA_TRANSITION_MS,
  getMapTransitionPosition,
  type MapCameraPosition
} from "@/components/maps/mapCamera";
import { MapLiveTradeTape } from "@/components/maps/MapLiveTradeTape";
import {
  COUNTRY_MARKET_MAPS,
  REGION_MARKETS,
  getCountryMarketMaps,
  getRegionMarketPairLabel,
  getRegionMarketsByCountry,
  getSpotlightState,
  inferSpotlightCodeFromMarket,
  marketMatchesRegion
} from "@/components/maps/spotlightStates";
import type {
  CountryMarketMap,
  RegionMarket
} from "@/components/maps/spotlightStates";
import type {
  LiveMicrostructureMetrics,
  LiveReplay,
  MarketSnapshot,
  MarketTradePrint,
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

function formatContractDate(value: string | undefined, status: MarketSnapshot["status"]) {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const dateLabel = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);

  return status === "closed" ? `Closed ${dateLabel}` : `Closes ${dateLabel}`;
}

type UsMarketMapProps = {
  market: MarketSnapshot;
  orderbook: OrderbookState;
  orderbookSummary?: OrderbookSummary | null;
  liveMicrostructure?: LiveMicrostructureMetrics | null;
  liveReplay?: LiveReplay | null;
  marketSeries?: TimePoint[];
  liveTrades?: MarketTradePrint[];
  selectedCode?: string | null;
  selectedCountryCode?: string;
  regionSignals?: RegionSignal[];
  activityThreshold?: number;
  autoTourEnabled?: boolean;
  countryScope?: ActivityCountryScope;
  activitySignalKind?: ActivitySignalFilter;
  activityMaxAgeHours?: ActivityTimeWindow;
  mapView?: MapViewMode;
  onActivityThresholdChange?: (score: number) => void;
  onAutoTourEnabledChange?: (enabled: boolean) => void;
  onCountryScopeChange?: (scope: ActivityCountryScope) => void;
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
  liveTrades = [],
  selectedCode,
  selectedCountryCode = "US",
  regionSignals = [],
  activityThreshold = 50,
  autoTourEnabled = false,
  countryScope = "global",
  activitySignalKind = "all",
  activityMaxAgeHours = 0,
  mapView = "country",
  onActivityThresholdChange,
  onAutoTourEnabledChange,
  onCountryScopeChange,
  onActivitySignalKindChange,
  onActivityMaxAgeHoursChange,
  onMapViewChange,
  onSelectCode,
  onSelectCountryCode
}: UsMarketMapProps) {
  const defaultCode = useMemo(() => inferSpotlightCodeFromMarket(market), [market]);
  const availableCountries = useMemo(() => getCountryMarketMaps(), []);
  const activeCountry = COUNTRY_MARKET_MAPS.find((country) => country.code === selectedCountryCode) ?? COUNTRY_MARKET_MAPS[0];
  const allRegionMarkets = useMemo(() => REGION_MARKETS, []);
  const regionMarkets = useMemo(() => getRegionMarketsByCountry(activeCountry.code), [activeCountry.code]);
  const signalByRegion = useMemo(
    () =>
      new Map(
        regionSignals.map((signal) => [
          `${signal.countryCode}:${signal.regionCode}`,
          signal
        ])
      ),
    [regionSignals]
  );
  const getRegionSignal = (region: RegionMarket) =>
    signalByRegion.get(`${region.countryCode}:${region.code}`) ?? region.signal;
  const countrySummaries = useMemo(
    () =>
      availableCountries.map((country) => {
        const regions = getRegionMarketsByCountry(country.code);
        const topRegion = regions
          .filter(
            (region) =>
              region.marketStatus !== "closed" &&
              region.marketStatus !== "inactive"
          )
          .map((region) => ({
            region,
            signal: getRegionSignal(region)
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
          signal: getRegionSignal(region)
        }))
        .filter(({ signal }) => signal.score >= 70)
        .sort((left, right) => right.signal.score - left.signal.score)
        .slice(0, 3),
    [regionMarkets, signalByRegion]
  );
  const labeledCountries = useMemo(
    () =>
      countrySummaries
        .filter(
          (summary) =>
            summary.topRegion && summary.topRegion.signal.score >= 70
        )
        .sort(
          (left, right) =>
            (right.topRegion?.signal.score ?? 0) -
            (left.topRegion?.signal.score ?? 0)
        ),
    [countrySummaries]
  );
  const alertSignals = useMemo(
    () =>
      regionSignals.map((signal) => {
        const region = allRegionMarkets.find(
          (candidate) =>
            candidate.countryCode === signal.countryCode &&
            candidate.code === signal.regionCode
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
    [allRegionMarkets, regionSignals]
  );
  const signalWatchlist = useSignalWatchlist(alertSignals);
  const [localSelectedCode, setLocalSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [hoveredBoundaryLabel, setHoveredBoundaryLabel] = useState<string | null>(
    null
  );
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourTransitioning, setTourTransitioning] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [mapPosition, setMapPosition] = useState<MapCameraPosition>({
    center: [0, 20],
    zoom: 1
  });
  const mapPositionRef = useRef(mapPosition);
  const mapAnimationFrameRef = useRef<number | null>(null);
  const mapSettleTimeoutRef = useRef<number | null>(null);
  const mapSurfaceRef = useRef<HTMLDivElement>(null);
  const activeSelectedCode = selectedCode ?? localSelectedCode;
  const selectedState = getSpotlightState(activeSelectedCode);
  const defaultRegion = getSpotlightState(defaultCode);
  const activeRegion =
    selectedState?.countryCode === activeCountry.code
      ? selectedState
      : defaultRegion?.countryCode === activeCountry.code
        ? defaultRegion
        : null;

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

  useEffect(() => {
    mapPositionRef.current = mapPosition;
  }, [mapPosition]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenActive(document.fullscreenElement === mapSurfaceRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === mapSurfaceRef.current) {
        await document.exitFullscreen();
      } else {
        await mapSurfaceRef.current?.requestFullscreen();
      }
    } catch {
      setFullscreenActive(false);
    }
  };

  const cancelMapTransition = useCallback(() => {
    if (mapAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(mapAnimationFrameRef.current);
      mapAnimationFrameRef.current = null;
    }
    if (mapSettleTimeoutRef.current !== null) {
      window.clearTimeout(mapSettleTimeoutRef.current);
      mapSettleTimeoutRef.current = null;
    }
    setTourTransitioning(false);
  }, []);

  useEffect(() => {
    const countryZoom =
      activeCountry.code === "GB"
        ? 6
        : activeCountry.code === "US"
          ? 2.1
          : activeCountry.defaultZoom;
    const target: MapCameraPosition =
      mapView === "world"
        ? { center: [0, 20], zoom: 1 }
        : tourActive && activeRegion
          ? {
              center: activeRegion.center,
              zoom: activeRegion.zoom
            }
          : {
              center: activeCountry.defaultCenter,
              zoom: countryZoom
            };

    cancelMapTransition();

    if (!tourActive) {
      mapPositionRef.current = target;
      setMapPosition(target);
      return;
    }

    const from = mapPositionRef.current;
    const isAlreadyAtTarget =
      Math.abs(from.center[0] - target.center[0]) < 0.001 &&
      Math.abs(from.center[1] - target.center[1]) < 0.001 &&
      Math.abs(from.zoom - target.zoom) < 0.001;

    if (isAlreadyAtTarget) return;

    setTourTransitioning(true);
    const startedAt = window.performance.now();

    const animate = (timestamp: number) => {
      const progress = Math.min(
        1,
        (timestamp - startedAt) / MAP_CAMERA_TRANSITION_MS
      );
      const position = getMapTransitionPosition(from, target, progress);
      mapPositionRef.current = position;
      setMapPosition(position);

      if (progress < 1) {
        mapAnimationFrameRef.current =
          window.requestAnimationFrame(animate);
        return;
      }

      mapAnimationFrameRef.current = null;
      mapSettleTimeoutRef.current = window.setTimeout(() => {
        mapSettleTimeoutRef.current = null;
        setTourTransitioning(false);
      }, MAP_CAMERA_SETTLE_MS);
    };

    mapAnimationFrameRef.current = window.requestAnimationFrame(animate);

    return cancelMapTransition;
  }, [
    activeCountry,
    activeRegion,
    cancelMapTransition,
    mapView,
    tourActive
  ]);

  const tourRegions = useMemo(
    () => getAutoTourRegions(allRegionMarkets, regionSignals),
    [allRegionMarkets, regionSignals]
  );

  useEffect(() => {
    setTourActive(autoTourEnabled);
  }, [autoTourEnabled]);

  const setTourEnabled = (enabled: boolean) => {
    if (!enabled) cancelMapTransition();
    setTourActive(enabled);
    onAutoTourEnabledChange?.(enabled);
  };

  useEffect(() => {
    if (
      !tourActive ||
      tourTransitioning ||
      !tourRegions.length ||
      !onSelectCountryCode ||
      !onSelectCode ||
      !onMapViewChange
    ) {
      return;
    }

    const delay = mapView === "world" ? 3_500 : 6_500;
    const timeout = window.setTimeout(() => {
      const region = tourRegions[tourIndex % tourRegions.length];
      onSelectCountryCode(region.countryCode);
      onSelectCode(region.code);
      onMapViewChange("country");
      setTourIndex((current) => (current + 1) % tourRegions.length);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [
    mapView,
    onMapViewChange,
    onSelectCode,
    onSelectCountryCode,
    tourActive,
    tourIndex,
    tourRegions,
    tourTransitioning
  ]);

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
  const activeSignal = activeRegion ? getRegionSignal(activeRegion) : null;
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
  const marketCloseLabel = formatContractDate(market.endDate, market.status);
  const highPriorityCount = regionMarkets.filter(
    (region) => getRegionSignal(region).score >= 70
  ).length;
  const hoveredRegion = getSpotlightState(hoveredCode);
  const hoveredSignal = hoveredRegion
    ? getRegionSignal(hoveredRegion)
    : null;

  const selectCountry = (country: CountryMarketMap) => {
    setTourEnabled(false);
    onSelectCountryCode?.(country.code);
    selectCode(country.defaultRegionCode);
    onMapViewChange?.("country");
  };

  const selectRegion = (region: RegionMarket) => {
    setTourEnabled(false);
    const country =
      availableCountries.find((candidate) => candidate.code === region.countryCode) ??
      activeCountry;
    onSelectCountryCode?.(country.code);
    selectCode(region.code);
    onMapViewChange?.("country");
  };

  return (
    <div
      className={`grid gap-8 ${
        mapView === "country"
          ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)] lg:items-start xl:grid-cols-[3fr_1fr]"
          : ""
      }`}
    >
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="font-sans text-xs font-medium text-slate-600">
            {mapView === "world"
              ? `${allRegionMarkets.length} markets tracked across ${availableCountries.length} countries`
              : `${regionMarkets.length} markets tracked · ${highPriorityCount} high priority${
                  activeRegion ? ` · Focus ${activeRegion.label}` : ""
                }`}
          </p>
        </div>

        <div className="grid items-stretch gap-6">
          <div
            ref={mapSurfaceRef}
            className="market-map-surface relative order-2 aspect-[4/3] min-h-[320px] overflow-hidden rounded-lg bg-transparent lg:order-1 lg:aspect-[16/10]"
            style={{ border: "1.5px solid var(--demo-card-bg)" }}
            onPointerDownCapture={(event) => {
              if (
                (event.target as HTMLElement).closest("[data-map-control]")
              ) {
                return;
              }
              setTourEnabled(false);
            }}
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 147 }}
              width={980}
              height={620}
              className="h-full w-full"
            >
              <ZoomableGroup
                center={mapPosition.center}
                zoom={mapPosition.zoom}
                minZoom={0.8}
                maxZoom={12}
                onMoveEnd={({ coordinates, zoom }) =>
                  setMapPosition({
                    center: coordinates as [number, number],
                    zoom
                  })
                }
                translateExtent={[
                  [-220, -100],
                  [1200, 720]
                ]}
              >
                <Geographies geography={worldCountries}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const country = availableCountries.find(
                        (candidate) =>
                          candidate.worldFeatureIds.includes(String(geo.id))
                      );
                      const topSignal = country
                        ? countrySummaries.find(
                            (summary) => summary.country.code === country.code
                          )?.topRegion?.signal
                        : null;
                      const isSelectedCountry =
                        mapView === "country" && country?.code === activeCountry.code;
                      const countryInteractive =
                        mapView === "world" ? country : undefined;
                      const fill = isSelectedCountry
                        ? "#cbd5e1"
                        : mapView === "world" && topSignal
                          ? getMarketSignalColor(topSignal.score)
                          : "#e5e7eb";

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={
                            countryInteractive
                              ? () => selectCountry(countryInteractive)
                              : undefined
                          }
                          onKeyDown={
                            countryInteractive
                              ? (event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectCountry(countryInteractive);
                                  }
                                }
                              : undefined
                          }
                          aria-label={
                            countryInteractive
                              ? `${countryInteractive.label}: top activity score ${topSignal?.score ?? 0}`
                              : undefined
                          }
                          role={countryInteractive ? "button" : "presentation"}
                          tabIndex={countryInteractive ? 0 : -1}
                          style={{
                            default: {
                              fill,
                              outline: "none",
                              stroke: "var(--map-boundary)",
                              strokeWidth: isSelectedCountry ? 1.4 : 0.45,
                              cursor: countryInteractive ? "pointer" : "grab"
                            },
                            hover: {
                              fill: countryInteractive ? fill : "#d4d4d8",
                              outline: "none",
                              stroke: "var(--map-boundary)",
                              strokeWidth: countryInteractive ? 1.2 : 0.45,
                              cursor: countryInteractive ? "pointer" : "grab"
                            },
                            pressed: {
                              fill,
                              outline: "none",
                              stroke: "var(--map-boundary)",
                              strokeWidth: 1.2
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>

                {mapView === "country" ? (() => {
                  const country = activeCountry;
                  const regions = regionMarkets;
                  const regionById = new Map(
                    regions.map((region) => [region.featureId, region])
                  );
                  const nationalRegion = regions.find(
                    (region) => region.coverage === "country"
                  );
                  const geography =
                    country.code === "US"
                      ? usAtlas
                      : country.code === "GB"
                        ? ukRegions
                        : country.code === "FR"
                          ? franceRegions
                          : country.code === "DE"
                            ? germanyStates
                            : worldCountries;

                  return (
                    <Geographies key={country.code} geography={geography}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          if (
                            geography === worldCountries &&
                            !country.worldFeatureIds.includes(String(geo.id))
                          ) {
                            return null;
                          }

                          const featureId =
                            country.code === "US"
                              ? String(geo.id).padStart(2, "0")
                              : country.featureIdProperty
                                ? String(
                                    geo.properties?.[
                                      country.featureIdProperty
                                    ] ?? ""
                                  )
                                : String(geo.id);
                          const region =
                            nationalRegion ?? regionById.get(featureId) ?? null;
                          const boundaryLabel = String(
                            geo.properties?.nom ??
                              geo.properties?.name ??
                              geo.properties?.NAME ??
                              region?.label ??
                              country.label
                          );
                          const signal = region ? getRegionSignal(region) : null;
                          const isSelected =
                            region?.countryCode === activeCountry.code &&
                            region?.code === activeSelectedCode;
                          const fill = signal
                            ? getMarketSignalColor(signal.score)
                            : "#e5e7eb";

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onClick={
                                region ? () => selectRegion(region) : undefined
                              }
                              onMouseEnter={
                                region
                                  ? () => {
                                      setHoveredCode(region.code);
                                      setHoveredBoundaryLabel(boundaryLabel);
                                    }
                                  : undefined
                              }
                              onMouseLeave={
                                region
                                  ? () => {
                                      setHoveredCode(null);
                                      setHoveredBoundaryLabel(null);
                                    }
                                  : undefined
                              }
                              onKeyDown={
                                region
                                  ? (event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        selectRegion(region);
                                      }
                                    }
                                  : undefined
                              }
                              aria-label={
                                region && signal
                                  ? `${boundaryLabel}, ${country.label}: ${region.coverage === "country" ? "national market " : ""}activity score ${signal.score}, ${getMarketSignalSeverity(signal.score)}`
                                  : undefined
                              }
                              role={region ? "button" : "presentation"}
                              tabIndex={region ? 0 : -1}
                              style={{
                                default: {
                                  fill,
                                  outline: "none",
                                  stroke: "var(--map-boundary)",
                                  strokeWidth:
                                    (isSelected ? 1.8 : 0.55) /
                                    mapPosition.zoom,
                                  cursor: region ? "pointer" : "grab"
                                },
                                hover: {
                                  fill: region ? fill : "#d4d4d8",
                                  outline: "none",
                                  stroke: "var(--map-boundary)",
                                  strokeWidth:
                                    (region ? 1.4 : 0.55) /
                                    mapPosition.zoom,
                                  cursor: region ? "pointer" : "grab"
                                },
                                pressed: {
                                  fill,
                                  outline: "none",
                                  stroke: "var(--map-boundary)",
                                  strokeWidth:
                                    (region ? 1.8 : 0.55) /
                                    mapPosition.zoom
                                }
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  );
                })() : null}

                {mapView === "world"
                  ? labeledCountries.map(({ country, topRegion }) => (
                      <Marker
                        key={country.code}
                        coordinates={country.defaultCenter}
                      >
                        <g aria-hidden="true" className="pointer-events-none">
                          <circle
                            r={8 / mapPosition.zoom}
                            fill={getMarketSignalColor(
                              topRegion?.signal.score ?? 0
                            )}
                            stroke="#ffffff"
                            strokeWidth={1.5 / mapPosition.zoom}
                          />
                          <text
                            y={-14 / mapPosition.zoom}
                            textAnchor="middle"
                            fill="#111827"
                            fontFamily="Inter, Segoe UI, sans-serif"
                            fontSize={9 / mapPosition.zoom}
                            fontWeight={700}
                            paintOrder="stroke"
                            stroke="var(--demo-card-bg)"
                            strokeWidth={3 / mapPosition.zoom}
                          >
                            {country.code} {topRegion?.signal.score ?? 0}
                          </text>
                        </g>
                      </Marker>
                    ))
                  : labeledRegions.map(({ region, signal }) => (
                  <Marker
                    key={`${region.countryCode}:${region.code}`}
                    coordinates={region.center}
                  >
                    <g aria-hidden="true" className="pointer-events-none">
                      <circle
                        r={8 / mapPosition.zoom}
                        fill={getMarketSignalColor(signal.score)}
                        stroke="#ffffff"
                        strokeWidth={1.5 / mapPosition.zoom}
                      />
                      <text
                        y={-14 / mapPosition.zoom}
                        textAnchor="middle"
                        fill="#111827"
                        fontFamily="Inter, Segoe UI, sans-serif"
                        fontSize={9 / mapPosition.zoom}
                        fontWeight={700}
                        paintOrder="stroke"
                        stroke="var(--demo-card-bg)"
                        strokeWidth={3 / mapPosition.zoom}
                      >
                        {region.code} {signal.score}
                      </text>
                    </g>
                  </Marker>
                    ))}
              </ZoomableGroup>
            </ComposableMap>
            {hoveredRegion && hoveredSignal ? (
              <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[260px] border border-slate-200 bg-white/95 px-3 py-2 font-sans shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-900">
                    {hoveredBoundaryLabel ?? hoveredRegion.label}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-slate-900">{hoveredSignal.score}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-600">
                  {getRegionMarketPairLabel(hoveredRegion)}
                </p>
              </div>
            ) : null}
            <MapLiveTradeTape trades={liveTrades} />
            <div
              data-map-control
              className="absolute right-3 top-3 z-10 flex gap-2"
            >
              <button
                type="button"
                title={fullscreenActive ? "Exit fullscreen" : "Enter fullscreen"}
                aria-label={
                  fullscreenActive ? "Exit fullscreen map" : "Enter fullscreen map"
                }
                aria-pressed={fullscreenActive}
                onClick={toggleFullscreen}
                className="grid h-9 w-9 place-items-center border border-slate-300 bg-white/95 font-sans text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-500"
              >
                {fullscreenActive ? "×" : "⛶"}
              </button>
              <button
                type="button"
                title={tourActive ? "Pause live map tour" : "Resume live map tour"}
                aria-label={tourActive ? "Pause live map tour" : "Resume live map tour"}
                aria-pressed={tourActive}
                onClick={() => setTourEnabled(!tourActive)}
                className="grid h-9 w-9 place-items-center border border-slate-300 bg-white/95 font-sans text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-500"
              >
                {tourActive ? "Ⅱ" : "▶"}
              </button>
            </div>
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
              href={
                mapView === "world"
                  ? "https://github.com/topojson/world-atlas"
                  : activeCountry.boundarySourceUrl
              }
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-slate-400 hover:text-slate-700"
            >
              Boundaries:{" "}
              {mapView === "world"
                ? "Natural Earth"
                : activeCountry.boundarySourceLabel}{" "}
              ↗
            </a>
          </div>
          <div className="order-1 lg:order-3">
            <AbnormalActivityFeed
              regions={
                countryScope === "global" ? allRegionMarkets : regionMarkets
              }
              signals={regionSignals}
              selectedCode={activeSelectedCode ?? defaultCode}
              minimumScore={activityThreshold}
              signalKind={activitySignalKind}
              maxAgeHours={activityMaxAgeHours}
              countryCode={activeCountry.code}
              countryLabel={activeCountry.label}
              countryScope={countryScope}
              watchlist={signalWatchlist.watchlist}
              watchedOnly={signalWatchlist.watchedOnly}
              alertsEnabled={signalWatchlist.alertsEnabled}
              alertPermission={signalWatchlist.alertPermission}
              onCountryScopeChange={(scope) => {
                setTourEnabled(false);
                onCountryScopeChange?.(scope);
              }}
              onMinimumScoreChange={onActivityThresholdChange ?? (() => undefined)}
              onSignalKindChange={onActivitySignalKindChange ?? (() => undefined)}
              onMaxAgeHoursChange={onActivityMaxAgeHoursChange ?? (() => undefined)}
              onWatchedOnlyChange={signalWatchlist.setWatchedOnly}
              onAlertsEnabledChange={(enabled) => {
                void signalWatchlist.setBrowserAlertsEnabled(enabled);
              }}
              onToggleWatch={signalWatchlist.toggleWatch}
              onSelect={selectRegion}
            />
          </div>
        </div>
      </div>

      <div
        className={
          mapView === "world" ? "hidden" : "pt-4 lg:pl-2 lg:pt-0"
        }
      >
        <p className="metric-label">Market Overview</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
            {activeRegion?.label ?? compactTitle}
          </h3>
          {marketMatchesActiveRegion && market.status === "closed" ? (
            <span className="border border-slate-400 px-2 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Closed
            </span>
          ) : null}
        </div>
        {activeRegion ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {activeRegion.countryLabel} ·{" "}
            {marketMatchesActiveRegion && market.status === "closed"
              ? "This contract is closed. Market statistics are historical."
              : activeRegion.note}
          </p>
        ) : null}

        {marketMatchesActiveRegion ? (
          <div className="mt-6 font-sans">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {market.status === "closed" ? "Final probability" : "Probability"}
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                  {(market.probability * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {market.status === "closed" ? "Last 24h volume" : "24h volume"}
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                  {market.status === "closed" && market.volume24h === 0
                    ? "—"
                    : formatCompactCurrency(market.volume24h)}
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
                  {market.status === "closed" && !market.liquidity
                    ? "—"
                    : formatCompactCurrency(market.liquidity)}
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
              {market.status === "open" ? "Open market ↗" : "View market ↗"}
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
        {marketMatchesActiveRegion && market.status === "closed" ? (
          <div className="mt-8">
            <p className="metric-label">Historical Contract</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Live depth, trade flow, and wallet activity are unavailable after market closure.
              Use price history to review how the contract resolved.
            </p>
          </div>
        ) : marketMatchesActiveRegion ? (
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
