"use client";

import type { EChartsOption } from "echarts";
import { ReactECharts } from "./ChartContainer";

type StateMetricDatum = {
  state: string;
  volatility: number;
  divergence: number;
  correlation: number;
};

type StateMetricSmallMultiplesProps = {
  data: StateMetricDatum[];
};

function buildMetricOption(
  data: StateMetricDatum[],
  metric: keyof Omit<StateMetricDatum, "state">,
  color: string,
  formatter: (value: number) => string,
): EChartsOption {
  const sorted = [...data].sort((left, right) => right[metric] - left[metric]);

  return {
    animationDuration: 400,
    grid: {
      left: 10,
      right: 12,
      top: 12,
      bottom: 8,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => formatter(Number(value)),
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => formatter(value),
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.14)" } },
    },
    yAxis: {
      type: "category",
      data: sorted.map((item) => item.state),
      axisLabel: {
        color: "#334155",
        fontSize: 11,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: sorted.map((item) => item[metric]),
        barWidth: 12,
        itemStyle: {
          color,
          borderRadius: [0, 6, 6, 0],
        },
      },
    ],
  };
}

export function StateMetricSmallMultiples({ data }: StateMetricSmallMultiplesProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Cross-state comparison becomes available once state summaries are loaded.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="metric-label">Volatility</p>
        <p className="mt-1 text-sm text-slate-500">Realized market volatility by state</p>
        <div className="mt-3">
          <ReactECharts option={buildMetricOption(data, "volatility", "#7c3aed", (value) => `${value.toFixed(0)}%`)} style={{ height: 220 }} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="metric-label">Divergence</p>
        <p className="mt-1 text-sm text-slate-500">Current PM minus polling gap in points</p>
        <div className="mt-3">
          <ReactECharts option={buildMetricOption(data, "divergence", "#be123c", (value) => `${value.toFixed(1)}`)} style={{ height: 220 }} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="metric-label">Correlation</p>
        <p className="mt-1 text-sm text-slate-500">Market-poll alignment coefficient</p>
        <div className="mt-3">
          <ReactECharts option={buildMetricOption(data, "correlation", "#0f172a", (value) => value.toFixed(2))} style={{ height: 220 }} />
        </div>
      </div>
    </div>
  );
}
