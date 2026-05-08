"use client";

import type { EChartsOption } from "echarts";
import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { TimePoint, TimelineEvent } from "@/types/market";
import { ReactECharts } from "./ChartContainer";

type PolymarketHistoryChartProps = {
  events?: TimelineEvent[];
  series: TimePoint[];
};

type AnnotationPlacement = {
  headline: string;
  id: string;
  source: string;
  summary: string;
  x: number;
  y: number;
};

type WhalePlacement = {
  amountUsd: number;
  id: string;
  outcome: "YES" | "NO";
  timestamp: string;
  wallet: string;
  x: number;
  y: number;
};

const WHALE_DOT_COLOR = "#f5b500";

const WHALE_PLACEHOLDERS: Array<Pick<WhalePlacement, "amountUsd" | "outcome" | "wallet">> = [
  { amountUsd: 1_240_000, outcome: "YES", wallet: "0x9F2E…A14C" },
  { amountUsd: 875_000, outcome: "YES", wallet: "0x4B81…73DD" }
];

function buildWhalePlacements(
  series: TimePoint[],
  yAxisMin: number,
  yAxisMax: number
): WhalePlacement[] {
  if (series.length < 2) return [];
  const span = Math.max(yAxisMax - yAxisMin, 0.001);
  // Place placeholders at ~35% and ~78% of the series so they don't sit on top of the news annotations.
  const positions = [0.35, 0.78];

  return positions.map((fraction, index) => {
    const seriesIndex = Math.min(series.length - 1, Math.max(0, Math.round(fraction * (series.length - 1))));
    const point = series[seriesIndex];
    const placeholder = WHALE_PLACEHOLDERS[index % WHALE_PLACEHOLDERS.length];
    return {
      id: `whale-${seriesIndex}-${index}`,
      amountUsd: placeholder.amountUsd,
      outcome: placeholder.outcome,
      wallet: placeholder.wallet,
      timestamp: point.timestamp,
      x: seriesIndex / (series.length - 1),
      y: 1 - (point.value - yAxisMin) / span
    };
  });
}

function formatWhaleAmount(usd: number) {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}k`;
  return `$${usd.toFixed(0)}`;
}

function pickIndices(length: number, desiredCount: number) {
  if (length <= 0) return [];
  if (length <= desiredCount) return Array.from({ length }, (_, index) => index);

  const indices = new Set<number>();
  for (let step = 0; step < desiredCount; step += 1) {
    indices.add(Math.round((step / (desiredCount - 1)) * (length - 1)));
  }

  return Array.from(indices).sort((left, right) => left - right);
}

const FALLBACK_ANNOTATIONS: Array<Pick<AnnotationPlacement, "headline" | "source" | "summary">> = [
  {
    source: "Polling Consortium",
    headline: "Swing-state polls tilt Republican",
    summary: "Composite polling broke decisively toward the Republican ticket, repricing the contract well above parity."
  },
  {
    source: "Campaign Desk",
    headline: "Democratic ticket reshuffles",
    summary: "An unexpected Democratic candidate change compressed the Republican lead as bettors priced in fresh momentum."
  },
  {
    source: "Macro Calendar",
    headline: "Soft data tests the rally",
    summary: "Below-consensus prints briefly weighed on the Republican contract before liquidity stabilized."
  },
  {
    source: "Event Monitor",
    headline: "Closing stretch flips bullish",
    summary: "Late-cycle debate and rally signals lifted Republican positioning; best-bid depth doubled overnight."
  }
];

function buildAnnotations(
  series: TimePoint[],
  events: TimelineEvent[],
  yAxisMin: number,
  yAxisMax: number
): AnnotationPlacement[] {
  const indices = pickIndices(series.length, Math.min(4, series.length));
  const selectedEvents = events.slice(0, indices.length);
  const span = Math.max(yAxisMax - yAxisMin, 0.001);

  return indices.map((index, annotationIndex) => {
    const point = series[index];
    const event = selectedEvents[annotationIndex];
    const fallback = FALLBACK_ANNOTATIONS[annotationIndex % FALLBACK_ANNOTATIONS.length];
    const x = series.length === 1 ? 0.5 : index / (series.length - 1);
    const y = 1 - (point.value - yAxisMin) / span;

    return {
      id: `${point.timestamp}-${annotationIndex}`,
      headline: event?.headline ?? fallback.headline,
      source: event?.source ?? fallback.source,
      summary: event?.summary ?? fallback.summary,
      x,
      y
    };
  });
}

export function PolymarketHistoryChart({ events = [], series }: PolymarketHistoryChartProps) {
  const { theme } = useTheme();

  const sortedSeries = useMemo(
    () => [...series].sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
    [series]
  );

  const chartModel = useMemo(() => {
    const values = sortedSeries.map((point) => point.value);
    const rawMin = values.length ? Math.min(...values) : 0;
    const rawMax = values.length ? Math.max(...values) : 1;
    const spread = rawMax - rawMin;
    const padding = Math.max(spread * 0.12, 0.03);
    const yAxisMin = Math.max(0, rawMin - padding);
    const yAxisMax = Math.min(1, rawMax + padding);
    const textColor = theme === "dark" ? "#f2f1ed" : "#0c0c0c";
    const subtleColor = theme === "dark" ? "rgba(242, 241, 237, 0.62)" : "rgba(12, 12, 12, 0.48)";
    const leaderColor = theme === "dark" ? "rgba(242, 241, 237, 0.35)" : "rgba(12, 12, 12, 0.28)";
    const gridColor = theme === "dark" ? "rgba(242, 241, 237, 0.08)" : "rgba(12, 12, 12, 0.08)";

    const option: EChartsOption = {
      animationDuration: 600,
      grid: {
        left: 18,
        right: 18,
        top: 48,
        bottom: 30,
        containLabel: true
      },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => `${(Number(value) * 100).toFixed(1)}%`
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: sortedSeries.map((point) => format(parseISO(point.timestamp), "MMM d")),
        axisLine: { lineStyle: { color: subtleColor } },
        axisTick: { show: false },
        axisLabel: {
          color: subtleColor,
          interval: Math.max(0, Math.floor(sortedSeries.length / 6))
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: "value",
        min: yAxisMin,
        max: yAxisMax,
        axisLabel: {
          color: subtleColor,
          formatter: (value: number) => `${Math.round(value * 100)}%`
        },
        splitLine: { lineStyle: { color: gridColor } }
      },
      series: [
        {
          name: "Polymarket Price",
          type: "line",
          smooth: 0.22,
          symbol: "circle",
          showSymbol: true,
          symbolSize: 5,
          itemStyle: { color: textColor },
          lineStyle: { width: 2.5, color: textColor },
          data: sortedSeries.map((point) => point.value)
        }
      ]
    };

    return {
      annotations: buildAnnotations(sortedSeries, events, yAxisMin, yAxisMax),
      leaderColor,
      option,
      textColor,
      whales: buildWhalePlacements(sortedSeries, yAxisMin, yAxisMax)
    };
  }, [events, sortedSeries, theme]);

  if (!sortedSeries.length) {
    return (
      <div className="flex h-[360px] items-center justify-center text-sm text-slate-500">
        No price history is available for this market.
      </div>
    );
  }

  const annotationCount = chartModel.annotations.length;

  return (
    <div className="relative w-full">
      {/* Desktop: callout band sits above the chart so cards never collide with the price line */}
      <div className="relative hidden w-full md:block" style={{ height: 132 }}>
        {chartModel.annotations.map((annotation, index) => {
          const isFirst = index === 0;
          const isLast = index === annotationCount - 1;
          const slotWidth = annotationCount > 0 ? 100 / annotationCount : 100;
          const cardStyle: React.CSSProperties = {
            top: 0,
            width: `calc(${slotWidth}% - 18px)`,
            borderColor: chartModel.textColor,
            color: chartModel.textColor
          };
          if (isFirst) {
            cardStyle.left = `${annotation.x * 100}%`;
          } else if (isLast) {
            cardStyle.right = `${(1 - annotation.x) * 100}%`;
          } else {
            cardStyle.left = `${annotation.x * 100}%`;
            cardStyle.transform = "translateX(-50%)";
          }
          return (
            <div
              key={`${annotation.id}-card`}
              className="pointer-events-none absolute border-l-[3px] pl-3 text-left"
              style={cardStyle}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">{annotation.source}</p>
              <p className="mt-1 text-sm font-medium leading-5">{annotation.headline}</p>
              <p className="mt-1 text-xs leading-5 opacity-75">{annotation.summary}</p>
            </div>
          );
        })}
      </div>

      <div className="relative h-[320px] w-full sm:h-[360px] md:h-[380px]">
        <ReactECharts option={chartModel.option} notMerge style={{ height: "100%", width: "100%" }} />

        {chartModel.annotations.map((annotation) => (
          <div key={`${annotation.id}-marker`} className="pointer-events-none hidden md:block">
            {/* Vertical leader line from chart top down to the dot */}
            <div
              className="absolute"
              style={{
                left: `${annotation.x * 100}%`,
                top: 0,
                height: `${annotation.y * 100}%`,
                width: 1,
                backgroundColor: chartModel.leaderColor,
                transform: "translateX(-0.5px)"
              }}
            />
            {/* Annotation dot on the line */}
            <div
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                left: `${annotation.x * 100}%`,
                top: `${annotation.y * 100}%`,
                backgroundColor: chartModel.textColor,
                borderColor: chartModel.textColor
              }}
            />
          </div>
        ))}

        {/* Whale buy markers — yellow dots on the line */}
        {chartModel.whales.map((whale) => (
          <div
            key={`${whale.id}-marker`}
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_0_3px_rgba(245,181,0,0.18)]"
            style={{
              left: `${whale.x * 100}%`,
              top: `${whale.y * 100}%`,
              backgroundColor: WHALE_DOT_COLOR,
              borderColor: WHALE_DOT_COLOR
            }}
            aria-label={`Whale buy ${formatWhaleAmount(whale.amountUsd)}`}
          />
        ))}
      </div>

      {/* Whale buy details — rendered below the chart on all breakpoints */}
      {chartModel.whales.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: WHALE_DOT_COLOR }}
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Whale buys on Polymarket
            </p>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              · placeholder
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {chartModel.whales.map((whale) => (
              <div
                key={`${whale.id}-card`}
                className="rounded-2xl border px-4 py-3"
                style={{ borderColor: "rgba(245, 181, 0, 0.45)", backgroundColor: "rgba(245, 181, 0, 0.08)" }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold" style={{ color: chartModel.textColor }}>
                    {formatWhaleAmount(whale.amountUsd)} {whale.outcome}
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    {format(parseISO(whale.timestamp), "MMM d, yyyy · HH:mm 'UTC'")}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Wallet {whale.wallet} swept the {whale.outcome} side; placeholder copy until live whale-flow feed is wired
                  in.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
