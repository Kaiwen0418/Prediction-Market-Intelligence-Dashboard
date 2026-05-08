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

function pickIndices(length: number, desiredCount: number) {
  if (length <= 0) return [];
  if (length <= desiredCount) return Array.from({ length }, (_, index) => index);

  const indices = new Set<number>();
  for (let step = 0; step < desiredCount; step += 1) {
    indices.add(Math.round((step / (desiredCount - 1)) * (length - 1)));
  }

  return Array.from(indices).sort((left, right) => left - right);
}

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
    const x = series.length === 1 ? 0.5 : index / (series.length - 1);
    const y = 1 - (point.value - yAxisMin) / span;

    return {
      id: `${point.timestamp}-${annotationIndex}`,
      headline: event?.headline ?? `News placeholder ${annotationIndex + 1}`,
      source: event?.source ?? "Placeholder source",
      summary: event?.summary ?? "Placeholder annotation for a market-moving development.",
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
      option,
      textColor
    };
  }, [events, sortedSeries, theme]);

  if (!sortedSeries.length) {
    return (
      <div className="flex h-[360px] items-center justify-center text-sm text-slate-500">
        No price history is available for this market.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative h-[320px] w-full sm:h-[360px] md:h-[380px]">
      <ReactECharts option={chartModel.option} notMerge style={{ height: "100%", width: "100%" }} />

      {chartModel.annotations.map((annotation) => {
        const placeLeft = annotation.x > 0.62;
        // Place callout above the dot only when dot is in the lower half of the chart;
        // dots near the top (low y value) get callouts below to avoid bleeding over content above.
        const placeAbove = annotation.y > 0.45;
        const horizontalStyle = placeLeft ? { right: "22px" } : { left: "22px" };
        const verticalStyle = placeAbove ? { bottom: "18px" } : { top: "18px" };

        return (
          <div
            key={annotation.id}
            className="pointer-events-none absolute hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 md:block"
            style={{
              left: `${annotation.x * 100}%`,
              top: `${annotation.y * 100}%`,
              backgroundColor: chartModel.textColor,
              borderColor: chartModel.textColor
            }}
          >
            <div
              className="absolute w-56 border-l-[3px] pl-4 text-left"
              style={{
                ...horizontalStyle,
                ...verticalStyle,
                borderColor: chartModel.textColor,
                color: chartModel.textColor
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">{annotation.source}</p>
              <p className="mt-1 text-sm font-medium leading-5">{annotation.headline}</p>
              <p className="mt-1 text-xs leading-5 opacity-75">{annotation.summary}</p>
            </div>
          </div>
        );
      })}
      </div>

      <div className="mt-4 grid gap-3 md:hidden">
        {chartModel.annotations.map((annotation) => (
          <div key={`${annotation.id}-mobile`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{annotation.source}</p>
            <p className="mt-1 text-sm font-medium leading-5 text-slate-900">{annotation.headline}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{annotation.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
