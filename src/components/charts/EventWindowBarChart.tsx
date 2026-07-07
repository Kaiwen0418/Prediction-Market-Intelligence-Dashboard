"use client";

import type { EChartsOption } from "echarts";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { EventWindowResult } from "@/types/analytics";
import { ReactECharts } from "./ChartContainer";

type EventWindowBarChartProps = {
  eventWindow: EventWindowResult;
  height?: number;
};

export function EventWindowBarChart({ eventWindow, height = 220 }: EventWindowBarChartProps) {
  const { theme } = useTheme();

  const textColor = theme === "dark" ? "#f2f1ed" : "#0f172a";
  const subtleColor = theme === "dark" ? "rgba(242, 241, 237, 0.52)" : "rgba(15, 23, 42, 0.46)";
  const gridColor = theme === "dark" ? "rgba(242, 241, 237, 0.08)" : "rgba(15, 23, 42, 0.08)";

  const data = [
    { label: "Pre", value: eventWindow.preChange, color: "#5c7ea6" },
    { label: "Post", value: eventWindow.postChange, color: "#9f5f71" },
    { label: "Net", value: eventWindow.netMove, color: "#111827" },
  ];

  const option: EChartsOption = {
    animationDuration: 400,
    grid: {
      left: 10,
      right: 10,
      top: 12,
      bottom: 24,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => `${Number(value).toFixed(2)} pts`,
    },
    xAxis: {
      type: "category",
      data: data.map((item) => item.label),
      axisLabel: {
        color: subtleColor,
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: subtleColor } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: subtleColor,
        formatter: (value: number) => `${value.toFixed(0)} pts`,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: gridColor } },
    },
    series: [
      {
        type: "bar",
        barWidth: 28,
        data: data.map((item) => ({
          value: item.value,
          itemStyle: {
            color: item.color,
            borderRadius: item.value >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
          },
        })),
        label: {
          show: true,
          position: "top",
          color: textColor,
          formatter: (params) => {
            const rawValue = Array.isArray(params.value) ? params.value[1] : params.value;
            const value = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);

            return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
          },
          fontSize: 11,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} />;
}
