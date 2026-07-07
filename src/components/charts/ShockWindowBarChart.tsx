"use client";

import type { EChartsOption } from "echarts";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { ShockWindowResult } from "@/types/analytics";
import { ReactECharts } from "./ChartContainer";

type ShockWindowBarChartProps = {
  windows: ShockWindowResult[];
  height?: number;
};

export function ShockWindowBarChart({ windows, height = 240 }: ShockWindowBarChartProps) {
  const { theme } = useTheme();

  if (!windows.length) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 text-sm text-slate-500" style={{ height }}>
        Shock windows become available once the market path has enough data.
      </div>
    );
  }

  const subtleColor = theme === "dark" ? "rgba(242, 241, 237, 0.52)" : "rgba(15, 23, 42, 0.46)";
  const gridColor = theme === "dark" ? "rgba(242, 241, 237, 0.08)" : "rgba(15, 23, 42, 0.08)";

  const sorted = [...windows].sort((left, right) => right.absoluteMove - left.absoluteMove);

  const option: EChartsOption = {
    animationDuration: 400,
    grid: {
      left: 10,
      right: 10,
      top: 12,
      bottom: 16,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => `${Number(value).toFixed(2)} pts`,
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: subtleColor,
        formatter: (value: number) => `${value.toFixed(0)} pts`,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: "category",
      data: sorted.map((window) => window.startTimestamp.slice(5, 10)),
      axisLabel: {
        color: subtleColor,
        fontSize: 11,
      },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Absolute move",
        type: "bar",
        barWidth: 14,
        data: sorted.map((window) => ({
          value: window.absoluteMove,
          itemStyle: {
            color: "#111827",
            borderRadius: [0, 6, 6, 0],
          },
        })),
      },
      {
        name: "Net move",
        type: "scatter",
        symbolSize: 10,
        data: sorted.map((window, index) => [window.absoluteMove, index]),
        itemStyle: {
          color: "#9f5f71",
        },
        tooltip: {
          valueFormatter: (_value, dataIndex) => `${sorted[dataIndex].netMove >= 0 ? "+" : ""}${sorted[dataIndex].netMove.toFixed(2)} pts net`,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} />;
}
