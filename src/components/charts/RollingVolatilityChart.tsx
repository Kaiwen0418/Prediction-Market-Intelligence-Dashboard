"use client";

import type { EChartsOption } from "echarts";
import { format, parseISO } from "date-fns";
import type { TimePoint } from "@/types/market";
import { ReactECharts } from "./ChartContainer";

type RollingVolatilityChartProps = {
  series: TimePoint[];
  windowSize?: number;
};

type VolPoint = {
  timestamp: string;
  volatility: number;
};

function buildRollingVolatility(series: TimePoint[], windowSize: number): VolPoint[] {
  if (series.length < 2) return [];
  const effectiveWindow = Math.min(windowSize, series.length);
  const points: VolPoint[] = [];

  for (let index = effectiveWindow - 1; index < series.length; index += 1) {
    const window = series.slice(index - effectiveWindow + 1, index + 1);
    const returns = window.slice(1).map((point, returnIndex) => point.value - window[returnIndex].value);
    if (!returns.length) continue;
    const avg = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const variance = returns.reduce((sum, value) => sum + (value - avg) ** 2, 0) / returns.length;
    points.push({
      timestamp: window.at(-1)?.timestamp ?? series[index].timestamp,
      volatility: Number((Math.sqrt(variance) * Math.sqrt(365) * 100).toFixed(2)),
    });
  }

  return points;
}

export function RollingVolatilityChart({ series, windowSize = 14 }: RollingVolatilityChartProps) {
  const points = buildRollingVolatility(series, windowSize);

  if (!points.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Rolling volatility appears once enough market points exist.
      </div>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${Number(value).toFixed(2)}%`
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
        formatter: (value: number) => `${value.toFixed(0)}%`
      },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.16)" } }
    },
    series: [
      {
        type: "line",
        name: "Rolling volatility",
        data: points.map((point) => point.volatility),
        smooth: true,
        symbol: "none",
        lineStyle: {
          width: 2,
          color: "#7c3aed"
        },
        areaStyle: {
          color: "rgba(124, 58, 237, 0.10)"
        }
      }
    ]
  };

  return <ReactECharts option={option} notMerge style={{ height: 160 }} />;
}
