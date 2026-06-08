"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import usAtlas from "us-atlas/states-10m.json";
import { DepthChart } from "@/components/charts/DepthChart";
import { getSpotlightState, inferSpotlightCodeFromMarket, SPOTLIGHT_STATES } from "@/components/maps/spotlightStates";
import type { MarketSnapshot } from "@/types/market";
import type { OrderbookState } from "@/types/market";
import type { SourceDiagnostics } from "@/types/service";
import { formatTimestamp, relativeTime } from "@/utils/time";

type UsMarketMapProps = {
  market: MarketSnapshot;
  orderbook: OrderbookState;
  selectedCode?: string | null;
  onSelectCode?: (code: string | null) => void;
  sources: {
    featuredMarket?: SourceDiagnostics;
    orderbook?: SourceDiagnostics;
    trades?: SourceDiagnostics;
  };
};

export function UsMarketMap({ market, orderbook, selectedCode, onSelectCode, sources }: UsMarketMapProps) {
  const defaultCode = useMemo(() => inferSpotlightCodeFromMarket(market), [market]);
  const [localSelectedCode, setLocalSelectedCode] = useState<string | null>(null);
  const activeSelectedCode = selectedCode ?? localSelectedCode;
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: [-96, 38],
    zoom: 1
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
  const zoomState = selectedState ?? getSpotlightState(defaultCode);

  useEffect(() => {
    const targetCenter: [number, number] = selectedState ? zoomState?.center ?? [-96, 38] : [-96, 38];
    const targetZoom = selectedState ? zoomState?.zoom ?? 1 : 1;

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
  }, [selectedState, zoomState]);

  const compactTitle = market.title.length > 56 ? `${market.title.slice(0, 56)}...` : market.title;

  const sourceDots = [
    { diagnostics: sources.featuredMarket, label: "featured" },
    { diagnostics: sources.orderbook, label: "orderbook" },
    { diagnostics: sources.trades, label: "trades" }
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)] lg:items-start xl:grid-cols-[3fr_1fr]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-slate-600">
            Click a spotlight state to open market context. Current live focus defaults to{" "}
            <span className="font-medium text-slate-900">{SPOTLIGHT_STATES.find((state) => state.code === defaultCode)?.label ?? "Texas"}</span>.
          </p>
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
                      const spotlight = SPOTLIGHT_STATES.find((state) => state.fips === fips);
                      const isSelected = spotlight?.code === activeSelectedCode;
                      const isDefault = spotlight?.code === defaultCode;
                      const fill = isSelected
                        ? spotlight?.status === "live"
                          ? "#9f5f71"
                          : spotlight?.status === "research"
                            ? "#5c7ea6"
                            : "#1f2937"
                        : isDefault
                          ? "#c47a8c"
                          : spotlight?.status === "research"
                            ? "#9eb5cf"
                            : "#e5e7eb";

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => spotlight && selectCode(spotlight.code)}
                          style={{
                            default: {
                              fill,
                              outline: "none",
                              stroke: "#ffffff",
                              strokeWidth: 0.8,
                              cursor: spotlight ? "pointer" : "default"
                            },
                          hover: {
                            fill: spotlight?.status === "live" ? "#b36f82" : spotlight?.status === "research" ? "#7092ba" : "#d4d4d8",
                            outline: "none",
                            stroke: "#ffffff",
                            strokeWidth: 0.8,
                              cursor: spotlight ? "pointer" : "default"
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
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <p className="metric-label">Realtime Market Rail</p>
        <h3 className="mt-2 text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
          {selectedState?.label ?? compactTitle}
        </h3>
        {selectedState ? <p className="mt-3 text-sm leading-6 text-slate-600">{selectedState.note}</p> : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {sourceDots.map(({ diagnostics, label }) => {
            const colorClass =
              diagnostics?.state === "live"
                ? "bg-emerald-500"
                : diagnostics?.state === "fallback"
                  ? "bg-amber-400"
                  : diagnostics?.state === "failed"
                    ? "bg-rose-500"
                    : "bg-slate-300";
            const detail = diagnostics?.issues[0]?.message ?? "Not checked yet";
            const checked = diagnostics?.checkedAt ? relativeTime(diagnostics.checkedAt) : "not checked";

            return (
              <span
                key={label}
                title={`${label}: ${diagnostics?.state ?? "pending"} · ${diagnostics?.mode ?? "mock"} · ${checked} · ${detail}`}
                className={`h-2.5 w-2.5 rounded-full ${colorClass}`}
              />
            );
          })}
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Source status</span>
        </div>

        {/* Depth chart only renders once the parent grid actually has a right panel (lg+).
            Below lg, the layout collapses to a single column and stacking the depth chart
            beneath the map looks broken — so we hide it entirely in that range. */}
        <div className="mt-6 hidden lg:block">
          <DepthChart askColor="#9f5f71" bidColor="#5c7ea6" orderbook={orderbook} height={300} />
        </div>

        {selectedState ? (
          <p className="mt-5 text-sm text-slate-600">
            Live focus: <span className="font-medium text-slate-900">{compactTitle}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
