"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import usAtlas from "us-atlas/states-10m.json";
import { DepthChart } from "@/components/charts/DepthChart";
import { AbnormalActivityFeed } from "@/components/maps/AbnormalActivityFeed";
import type {
  ActivitySignalFilter,
  ActivityTimeWindow
} from "@/components/maps/activityFeedFilters";
import {
  buildBackendHealthDetail,
  buildBackendHealthLine,
  buildSourceDotTitle,
  getReplaySourceLabel,
  getSourceDotColorClass
} from "@/components/maps/liveRailDiagnostics";
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
  inferSpotlightCodeFromMarket
} from "@/components/maps/spotlightStates";
import type {
  LiveDegradation,
  LiveMicrostructureMetrics,
  LiveReadiness,
  LiveRegistryHealth,
  LiveReplay,
  MarketSnapshot,
  OrderbookState,
  OrderbookSummary
} from "@/types/market";
import type { SourceDiagnostics } from "@/types/service";
import type { RegionSignal } from "@/types/signals";
import { formatTimestamp, relativeTime } from "@/utils/time";
import { useSignalWatchlist } from "@/hooks/useSignalWatchlist";

type UsMarketMapProps = {
  market: MarketSnapshot;
  orderbook: OrderbookState;
  orderbookSummary?: OrderbookSummary | null;
  liveMicrostructure?: LiveMicrostructureMetrics | null;
  liveReplay?: LiveReplay | null;
  liveReadiness?: LiveReadiness | null;
  liveDegradation?: LiveDegradation | null;
  liveRegistryHealth?: LiveRegistryHealth | null;
  selectedCode?: string | null;
  selectedCountryCode?: string;
  regionSignals?: RegionSignal[];
  activityThreshold?: number;
  activitySignalKind?: ActivitySignalFilter;
  activityMaxAgeHours?: ActivityTimeWindow;
  onActivityThresholdChange?: (score: number) => void;
  onActivitySignalKindChange?: (kind: ActivitySignalFilter) => void;
  onActivityMaxAgeHoursChange?: (hours: ActivityTimeWindow) => void;
  onSelectCode?: (code: string | null) => void;
  onSelectCountryCode?: (code: string) => void;
  sources: {
    featuredMarket?: SourceDiagnostics;
    liveStream?: SourceDiagnostics;
    liveReplay?: SourceDiagnostics;
    liveReadiness?: SourceDiagnostics;
    liveDegradation?: SourceDiagnostics;
    liveRegistry?: SourceDiagnostics;
    orderbook?: SourceDiagnostics;
    orderbookSummary?: SourceDiagnostics;
    regionSignals?: SourceDiagnostics;
    trades?: SourceDiagnostics;
  };
};

export function UsMarketMap({
  market,
  orderbook,
  orderbookSummary,
  liveMicrostructure,
  liveReplay,
  liveReadiness,
  liveDegradation,
  liveRegistryHealth,
  selectedCode,
  selectedCountryCode = "US",
  regionSignals = [],
  activityThreshold = 50,
  activitySignalKind = "all",
  activityMaxAgeHours = 0,
  onActivityThresholdChange,
  onActivitySignalKindChange,
  onActivityMaxAgeHoursChange,
  onSelectCode,
  onSelectCountryCode,
  sources
}: UsMarketMapProps) {
  const defaultCode = useMemo(() => inferSpotlightCodeFromMarket(market), [market]);
  const availableCountries = useMemo(() => getCountryMarketMaps(), []);
  const activeCountry = COUNTRY_MARKET_MAPS.find((country) => country.code === selectedCountryCode) ?? COUNTRY_MARKET_MAPS[0];
  const regionMarkets = useMemo(() => getRegionMarketsByCountry(activeCountry.code), [activeCountry.code]);
  const regionByFips = useMemo(() => new Map(regionMarkets.map((region) => [region.fips, region])), [regionMarkets]);
  const signalByRegion = useMemo(
    () => new Map(regionSignals.map((signal) => [signal.regionCode, signal])),
    [regionSignals]
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
  const activeSelectedCode = selectedCode ?? localSelectedCode;
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: activeCountry.defaultCenter,
    zoom: activeCountry.defaultZoom
  });
  const animationFrameRef = useRef<number | null>(null);

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
  const zoomState =
    selectedState?.countryCode === activeCountry.code
      ? selectedState
      : defaultRegion?.countryCode === activeCountry.code
        ? defaultRegion
        : null;

  useEffect(() => {
    const targetCenter: [number, number] =
      selectedState?.countryCode === activeCountry.code ? zoomState?.center ?? activeCountry.defaultCenter : activeCountry.defaultCenter;
    const targetZoom =
      selectedState?.countryCode === activeCountry.code ? zoomState?.zoom ?? activeCountry.defaultZoom : activeCountry.defaultZoom;

    const animate = () => {
      setView((current) => {
        const nextCenter: [number, number] = [
          current.center[0] + (targetCenter[0] - current.center[0]) * 0.02,
          current.center[1] + (targetCenter[1] - current.center[1]) * 0.02
        ];
        const nextZoom = current.zoom + (targetZoom - current.zoom) * 0.02;

        const settled =
          Math.abs(targetCenter[0] - nextCenter[0]) < 0.05 &&
          Math.abs(targetCenter[1] - nextCenter[1]) < 0.05 &&
          Math.abs(targetZoom - nextZoom) < 0.01;

        if (!settled) {
          animationFrameRef.current = window.requestAnimationFrame(animate);
          return {
            center: nextCenter,
            zoom: nextZoom
          };
        }

        animationFrameRef.current = null;
        return {
          center: targetCenter,
          zoom: targetZoom
        };
      });
    };

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeCountry, selectedState, zoomState]);

  const compactTitle = market.title.length > 56 ? `${market.title.slice(0, 56)}...` : market.title;

  const sourceDots = [
    { diagnostics: sources.regionSignals, label: "signals" },
    { diagnostics: sources.featuredMarket, label: "featured" },
    { diagnostics: sources.liveStream, label: "stream" },
    { diagnostics: sources.liveReplay, label: "replay" },
    { diagnostics: sources.liveReadiness, label: "ready" },
    { diagnostics: sources.liveDegradation, label: "degrade" },
    { diagnostics: sources.liveRegistry, label: "registry" },
    { diagnostics: sources.orderbookSummary, label: "summary" },
    { diagnostics: sources.orderbook, label: "orderbook" },
    { diagnostics: sources.trades, label: "trades" }
  ];

  const backendHealthLine = buildBackendHealthLine(liveReadiness, liveDegradation, liveRegistryHealth);
  const backendHealthDetail = buildBackendHealthDetail(liveReadiness, liveDegradation);

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
  const selectedRegionHasPair = Boolean(activeRegion?.liveMarketSlug);
  const defaultRegionLabel = defaultRegion?.countryCode === activeCountry.code ? defaultRegion.label : regionMarkets[0]?.label;
  const activeSignal = activeRegion ? signalByRegion.get(activeRegion.code) ?? activeRegion.signal : null;
  const liveSignalCount = regionSignals.filter((signal) => signal.source === "live").length;
  const signalModeLabel =
    liveSignalCount === regionMarkets.length && regionMarkets.length > 0
      ? "Live signals"
      : liveSignalCount > 0
        ? "Live + fallback"
        : "Demo snapshots";
  const marketMatchesActiveRegion =
    Boolean(activeRegion) &&
    (market.slug === activeRegion?.liveMarketSlug || market.eventSlug === activeRegion?.liveMarketSlug);
  const activePairLabel =
    activeRegion && marketMatchesActiveRegion
      ? compactTitle
      : activeRegion
        ? getRegionMarketPairLabel(activeRegion)
        : compactTitle;

  const getRegionFill = (regionCode?: string) => {
    const region = getSpotlightState(regionCode);
    const signal = region ? signalByRegion.get(region.code) ?? region.signal : null;
    return getMarketSignalColor(signal?.score);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)] lg:items-start xl:grid-cols-[3fr_1fr]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-slate-600">
            Colored regions have configured trading pairs. Click a region to select its active political market.
            {defaultRegionLabel ? (
              <>
                {" "}
                Current live focus defaults to <span className="font-medium text-slate-900">{defaultRegionLabel}</span>.
              </>
            ) : null}
          </p>
          {availableCountries.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Country</span>
              <select
                value={activeCountry.code}
                onChange={(event) => {
                  onSelectCountryCode?.(event.target.value);
                  selectCode(null);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                {availableCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="grid items-stretch gap-6">
          <div className="relative overflow-hidden rounded-[28px]" style={{ border: "1.5px solid var(--demo-card-bg)" }}>
            <ComposableMap projection="geoAlbersUsa" className="relative h-auto w-full overflow-visible">
              <ZoomableGroup
                center={view.center}
                zoom={view.zoom}
                translateExtent={[
                  [0, 0],
                  [980, 620]
                ]}
              >
                <Geographies geography={usAtlas}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const fips = String(geo.id).padStart(2, "0");
                      const region = regionByFips.get(fips);
                      const fill = getRegionFill(region?.code);
                      const isSelected = region?.code === activeSelectedCode;
                      const signal = region ? signalByRegion.get(region.code) ?? region.signal : null;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={region ? () => selectCode(region.code) : undefined}
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
              </ZoomableGroup>
            </ComposableMap>
            <div
              className="pointer-events-none absolute inset-0 rounded-[28px]"
              aria-hidden="true"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, transparent 42%, var(--demo-card-bg) 88%)"
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-slate-600">
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
            <span className="text-slate-400">{signalModeLabel}</span>
          </div>
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

      <div className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <p className="metric-label">Realtime Market Rail</p>
        <h3 className="mt-2 text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
          {activeRegion?.label ?? compactTitle}
        </h3>
        {activeRegion ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {activeRegion.countryLabel} · {activeRegion.note}
          </p>
        ) : null}

        {activeSignal ? (
          <div className="mt-5 border-y border-[var(--demo-card-divider)] py-4">
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
              {activeSignal.source === "fixture"
                ? "Demo signal snapshot"
                : `Live signal · ${Math.round((activeSignal.confidence ?? 0) * 100)}% component coverage`}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {sourceDots.map(({ diagnostics, label }) => {
            const colorClass = getSourceDotColorClass(diagnostics?.state);
            const title = buildSourceDotTitle(
              label,
              diagnostics
                ? {
                    ...diagnostics,
                    checkedAt: diagnostics.checkedAt ? relativeTime(diagnostics.checkedAt) : "not checked"
                  }
                : undefined
            );

            return (
              <span
                key={label}
                title={title}
                className={`h-2.5 w-2.5 rounded-full ${colorClass}`}
              />
            );
          })}
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Source status</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {backendHealthLine}
          <span className="text-slate-400"> — {backendHealthDetail}</span>
        </p>

        {/* Depth chart only renders once the parent grid actually has a right panel (lg+).
            Below lg, the layout collapses to a single column and stacking the depth chart
            beneath the map looks broken — so we hide it entirely in that range. */}
        <div className="mt-6 hidden lg:block">
          <DepthChart askColor="#9f5f71" bidColor="#5c7ea6" orderbook={orderbook} height={300} />
        </div>

        <div className="mt-6 border-t border-[var(--demo-card-divider)] pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="metric-label">Market Snapshot</p>
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {getReplaySourceLabel(liveReplay)}
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
            {showingBackendMetrics ? "Computed from the active FastAPI stream window." : "Estimated from the latest REST snapshot."}
          </p>
        </div>

        <div className="mt-6 border-t border-[var(--demo-card-divider)] pt-5">
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
                  ? "Relative detection is unavailable from the current data source."
                  : `At least ${whaleActivity.minimumSampleSize} normalized prints and two-sided depth are required.`}
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Flagged at {whaleActivity.historicalMultipleThreshold}x median size and{" "}
            {(whaleActivity.depthShareThreshold * 100).toFixed(0)}% of executable depth. Public trades do not
            establish wallet identity or insider activity.
          </p>
        </div>

        {selectedRegionHasPair ? (
          <p className="mt-5 text-sm text-slate-600">
            Pair: <span className="font-medium text-slate-900">{activePairLabel}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
