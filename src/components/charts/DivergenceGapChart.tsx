"use client";

import type { EChartsOption } from "echarts";
import { format, parseISO } from "date-fns";
import type { TimePoint } from "@/types/market";
import type { PollPoint } from "@/types/poll";
import { ReactECharts } from "./ChartContainer";

type DivergenceGapChartProps = {
  marketSeries: TimePoint[];
  pollSeries: PollPoint[];
};

type GapPoint = {
  timestamp: string;
  gap: number;
};

function dayKey(timestamp: string) {
  return timestamp.slice(0, 10);
}

function buildGapSeries(marketSeries: TimePoint[], pollSeries: PollPoint[]): GapPoint[] {
  const marketByDay = new Map(marketSeries.map((point) => [dayKey(point.timestamp), point.value]));
  const pollByDay = new Map(pollSeries.map((point) => [dayKey(point.timestamp), point.pollAverage]));
  const alignedDays = Array.from(new Set([...marketByDay.keys()].filter((key) => pollByDay.has(key)))).sort((a, b) =>
    a.localeCompare(b)
  );

  return alignedDays.map((timestamp) => ({
    timestamp: `${timestamp}T00:00:00.000Z`,
    gap: Number((((marketByDay.get(timestamp) ?? 0) - (pollByDay.get(timestamp) ?? 0)) * 100).toFixed(2)),
  }));
}

export function DivergenceGapChart({ marketSeries, pollSeries }: DivergenceGapChartProps) {
  const points = buildGapSeries(marketSeries, pollSeries);

  if (!points.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Gap path appears once market and polling data overlap on shared dates.
      </div>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${Number(value).toFixed(2)} pts`
    },
    grid: {
      left: 16,
      right: 16,
      top: 18,
      bottom: 24,
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: points.map((point) => format(parseISO(point.timestamp), "MMM d")),
      axisLabel: {
        color: "#64748b",
        showMinLabel: true,
        showMaxLabel: true
      },
      axisLine: { lineStyle: { color: "rgba(148, 163, 184, 0.5)" } }
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => `${value.toFixed(0)}`
      },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.16)" } }
    },
    series: [
      {
        type: "line",
        name: "Market - Poll gap",
        data: points.map((point) => point.gap),
        smooth: true,
        symbol: "none",
        lineStyle: {
          width: 2,
          color: "#be123c"
        },
        areaStyle: {
          color: "rgba(190, 18, 60, 0.10)"
        },
        markLine: {
          symbol: "none",
          lineStyle: {
            color: "rgba(100, 116, 139, 0.4)",
            type: "dashed"
          },
          data: [{ yAxis: 0 }]
        }
      }
    ]
  };

  return <ReactECharts option={option} notMerge style={{ height: 160 }} />;
}
