"use client";

import type { EChartsOption } from "echarts";
import type { TimePoint } from "@/types/market";
import type { PollPoint } from "@/types/poll";
import { formatTimestamp } from "@/utils/time";
import { ReactECharts } from "./ChartContainer";

type MarketPollChartProps = {
  marketSeries: TimePoint[];
  pollSeries: PollPoint[];
};

export function MarketPollChart({ marketSeries, pollSeries }: MarketPollChartProps) {
  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${(Number(value) * 100).toFixed(1)}%`
    },
    legend: {
      top: 0,
      textStyle: { color: "#334155" }
    },
    grid: {
      left: 28,
      right: 18,
      top: 52,
      bottom: 28,
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: marketSeries.map((point) => formatTimestamp(point.timestamp, "MMM d")),
      axisLine: { lineStyle: { color: "#94a3b8" } }
    },
    yAxis: {
      type: "value",
      min: 0.3,
      max: 0.8,
      axisLabel: {
        formatter: (value: number) => `${Math.round(value * 100)}%`
      },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.2)" } }
    },
    series: [
      {
        name: "Market Probability",
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 3, color: "#0b3c5d" },
        areaStyle: { color: "rgba(11, 60, 93, 0.10)" },
        data: marketSeries.map((point) => point.value)
      },
      {
        name: "Poll Average",
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: "#f97316", type: "dashed" },
        data: pollSeries.map((point) => point.pollAverage)
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 340 }} />;
}
