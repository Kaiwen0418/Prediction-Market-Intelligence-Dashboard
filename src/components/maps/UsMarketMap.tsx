"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import usAtlas from "us-atlas/states-10m.json";
import { DepthChart } from "@/components/charts/DepthChart";
import type { MarketSnapshot } from "@/types/market";
import type { OrderbookState } from "@/types/market";
import type { SourceDiagnostics } from "@/types/service";
import { formatTimestamp, relativeTime } from "@/utils/time";

type StateSpotlight = {
  code: string;
  center: [number, number];
  fips: string;
  label: string;
  note: string;
  zoom: number;
  status: "live" | "watch" | "research";
};

const SPOTLIGHT_STATES: StateSpotlight[] = [
  {
    code: "TX",
    center: [-99.3, 31.1],
    fips: "48",
    label: "Texas",
    note: "Current live market focus. Republican Senate primary liquidity and price discovery are active here.",
    zoom: 3.2,
    status: "live"
  },
  {
    code: "AZ",
    center: [-111.7, 34.2],
    fips: "04",
    label: "Arizona",
    note: "Historical battleground polling and PM comparison already exists in the research cache.",
    zoom: 4.2,
    status: "research"
  },
  {
    code: "GA",
    center: [-83.5, 32.7],
    fips: "13",
    label: "Georgia",
    note: "Useful swing-state comparison surface for polling-vs-market behaviour.",
    zoom: 5,
    status: "research"
  },
  {
    code: "MI",
    center: [-85.5, 44.4],
    fips: "26",
    label: "Michigan",
    note: "Research state with enough daily polling density to compare against cached PM paths.",
    zoom: 4.1,
    status: "research"
  },
  {
    code: "PA",
    center: [-77.7, 40.8],
    fips: "42",
    label: "Pennsylvania",
    note: "Dense battleground state with good fit for event-driven PM interpretation.",
    zoom: 5.2,
    status: "research"
  },
  {
    code: "WI",
    center: [-89.9, 44.6],
    fips: "55",
    label: "Wisconsin",
    note: "Useful for comparing slower polling drift against discrete market repricing.",
    zoom: 5.4,
    status: "research"
  },
  {
    code: "FL",
    center: [-82.3, 28.4],
    fips: "12",
    label: "Florida",
    note: "Kept as a watch state placeholder for future live map expansion.",
    zoom: 4.2,
    status: "watch"
  }
];

function inferSpotlightCode(market: MarketSnapshot) {
  const text = `${market.slug} ${market.eventSlug ?? ""} ${market.title}`.toLowerCase();
  const match = SPOTLIGHT_STATES.find((state) => text.includes(state.label.toLowerCase()));
  return match?.code ?? "TX";
}

type UsMarketMapProps = {
  market: MarketSnapshot;
  orderbook: OrderbookState;
  sources: {
    featuredMarket?: SourceDiagnostics;
    orderbook?: SourceDiagnostics;
    trades?: SourceDiagnostics;
  };
};

export function UsMarketMap({ market, orderbook, sources }: UsMarketMapProps) {
  const defaultCode = useMemo(() => inferSpotlightCode(market), [market]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: [-96, 38],
    zoom: 1
  });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedCode(null);
  }, [defaultCode]);

  const selectedState = SPOTLIGHT_STATES.find((state) => state.code === selectedCode) ?? null;
  const zoomState = selectedState ?? SPOTLIGHT_STATES.find((state) => state.code === defaultCode) ?? null;

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
                      const isSelected = spotlight?.code === selectedCode;
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
                          onClick={() => spotlight && setSelectedCode(spotlight.code)}
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

        <div className="mt-6 overflow-visible">
          <div className="flex min-h-[300px] items-center justify-center overflow-visible sm:min-h-[360px] lg:min-h-[430px] xl:min-h-[360px]">
            <div className="w-full max-w-[500px] -rotate-90 transform sm:max-w-[620px] lg:max-w-[680px] xl:max-w-[560px]">
              <DepthChart askColor="#9f5f71" bidColor="#5c7ea6" orderbook={orderbook} height={340} />
            </div>
          </div>
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
