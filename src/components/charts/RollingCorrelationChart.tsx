"use client";

import type { EChartsOption } from "echarts";
import { format, parseISO } from "date-fns";
import type { RollingCorrelationResult } from "@/types/analytics";
import { ReactECharts } from "./ChartContainer";

type RollingCorrelationChartProps = {
  rollingCorrelation: RollingCorrelationResult;
};

export function RollingCorrelationChart({ rollingCorrelation }: RollingCorrelationChartProps) {
  const points = rollingCorrelation.points ?? [];

  if (!points.length) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Rolling correlation history becomes available once enough aligned market and polling days exist.
      </div>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => Number(value).toFixed(2)
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
      min: -1,
      max: 1,
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => value.toFixed(1)
      },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.16)" } }
    },
    series: [
      {
        type: "line",
        name: "Rolling correlation",
        data: points.map((point) => point.coefficient),
        smooth: true,
        symbol: "none",
        lineStyle: {
          width: 2,
          color: "#0f172a"
        },
        areaStyle: {
          color: "rgba(15, 23, 42, 0.08)"
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

  return <ReactECharts option={option} notMerge style={{ height: 144 }} />;
}
