"use client";

import type { EChartsOption } from "echarts";
import { format, parseISO } from "date-fns";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { LiveMetricSample } from "@/types/market";
import { ReactECharts } from "./ChartContainer";

type LiveReplaySparklineProps = {
  samples: LiveMetricSample[];
  height?: number;
};

export function LiveReplaySparkline({ samples, height = 180 }: LiveReplaySparklineProps) {
  const { theme } = useTheme();

  if (!samples.length) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white/40 text-sm text-slate-500" style={{ height }}>
        No replay samples yet.
      </div>
    );
  }

  const textColor = theme === "dark" ? "#f2f1ed" : "#0f172a";
  const subtleColor = theme === "dark" ? "rgba(242, 241, 237, 0.5)" : "rgba(15, 23, 42, 0.42)";
  const gridColor = theme === "dark" ? "rgba(242, 241, 237, 0.08)" : "rgba(15, 23, 42, 0.08)";

  const option: EChartsOption = {
    animationDuration: 400,
    grid: {
      left: 10,
      right: 10,
      top: 16,
      bottom: 20,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${(Number(value) * 100).toFixed(1)}%`,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: samples.map((sample) => format(parseISO(sample.timestamp), "HH:mm:ss")),
      axisLine: { lineStyle: { color: subtleColor } },
      axisTick: { show: false },
      axisLabel: {
        color: subtleColor,
        interval: Math.max(0, Math.floor(samples.length / 4)),
        fontSize: 10,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: {
        color: subtleColor,
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: gridColor } },
    },
    series: [
      {
        name: "Mid Price",
        type: "line",
        smooth: 0.2,
        showSymbol: false,
        lineStyle: { width: 2, color: "#5c7ea6" },
        areaStyle: { color: "rgba(92, 126, 166, 0.12)" },
        data: samples.map((sample) => sample.midPrice),
      },
      {
        name: "Microprice",
        type: "line",
        smooth: 0.2,
        showSymbol: false,
        lineStyle: { width: 2, color: textColor, type: "dashed" },
        data: samples.map((sample) => sample.microprice),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} />;
}
