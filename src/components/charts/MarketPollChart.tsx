"use client";

import type { EChartsOption } from "echarts";
import { addDays, format, isValid, parseISO } from "date-fns";
import type { TimePoint } from "@/types/market";
import type { EventWindowResult } from "@/types/analytics";
import type { PollPoint } from "@/types/poll";
import { formatTimestamp } from "@/utils/time";
import { ReactECharts } from "./ChartContainer";

type MarketPollChartProps = {
  marketSeries: TimePoint[];
  pollSeries: PollPoint[];
  eventWindow?: EventWindowResult;
};

function toDateKey(timestamp: string) {
  const parsed = parseISO(timestamp);
  if (!isValid(parsed)) {
    return null;
  }

  return format(parsed, "yyyy-MM-dd");
}

function buildDayRange(start: string, end: string) {
  const days: string[] = [];
  let cursor = parseISO(`${start}T00:00:00.000Z`);
  const lastDay = parseISO(`${end}T00:00:00.000Z`);

  while (cursor <= lastDay) {
    days.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function MarketPollChart({ marketSeries, pollSeries, eventWindow }: MarketPollChartProps) {
  const normalizedMarketByDay = new Map<string, number>();
  for (const point of marketSeries) {
    const dayKey = toDateKey(point.timestamp);
    if (!dayKey) continue;
    normalizedMarketByDay.set(dayKey, point.value);
  }

  const normalizedPollByDay = new Map<string, number>();
  for (const point of pollSeries) {
    const dayKey = toDateKey(point.timestamp);
    if (!dayKey) continue;
    normalizedPollByDay.set(dayKey, point.pollAverage);
  }

  const allTimestamps = Array.from(
    new Set([
      ...Array.from(normalizedMarketByDay.keys()),
      ...Array.from(normalizedPollByDay.keys())
    ])
  ).sort((left, right) => left.localeCompare(right));
  const pollTimestamps = Array.from(normalizedPollByDay.keys()).sort((left, right) => left.localeCompare(right));
  const timelineStart = pollTimestamps[0] ?? allTimestamps[0];
  const timelineEnd = allTimestamps.at(-1) ?? timelineStart;
  const timeline =
    timelineStart && timelineEnd && timelineStart !== timelineEnd
      ? buildDayRange(timelineStart, timelineEnd)
      : timelineStart
        ? [timelineStart]
        : [];
  const marketData = timeline.map((timestamp) => normalizedMarketByDay.get(timestamp) ?? null);
  const pollData = timeline.map((timestamp) => normalizedPollByDay.get(timestamp) ?? null);
  const numericValues = [...marketData, ...pollData].filter((value): value is number => typeof value === "number");
  const rawMin = numericValues.length ? Math.min(...numericValues) : 0;
  const rawMax = numericValues.length ? Math.max(...numericValues) : 1;
  const spread = rawMax - rawMin;
  const padding = Math.max(spread * 0.05, 0.01);
  const yAxisMin = Math.max(0, rawMin - padding);
  const yAxisMax = Math.min(1, rawMax + padding);
  const anchorDay = eventWindow?.anchorTimestamp ? toDateKey(eventWindow.anchorTimestamp) : null;
  const anchorIndex = anchorDay ? timeline.indexOf(anchorDay) : -1;
  const anchorValue = anchorIndex >= 0 ? marketData[anchorIndex] : null;
  const chartKey = `${timeline[0] ?? "empty"}:${timeline.at(-1) ?? "empty"}:${marketSeries.length}:${pollSeries.length}:${yAxisMin}:${yAxisMax}`;

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
      data: timeline.map((timestamp) => formatTimestamp(`${timestamp}T00:00:00.000Z`, "MMM d")),
      axisLine: { lineStyle: { color: "#94a3b8" } }
    },
    yAxis: {
      type: "value",
      min: yAxisMin,
      max: yAxisMax,
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
        symbol: "circle",
        showSymbol: false,
        lineStyle: { width: 3, color: "#0b3c5d" },
        areaStyle: { color: "rgba(11, 60, 93, 0.10)" },
        connectNulls: false,
        data: marketData,
        markLine:
          anchorIndex >= 0
            ? {
                symbol: "none",
                label: {
                  show: true,
                  formatter: "Shock",
                  color: "#475569",
                  fontSize: 11
                },
                lineStyle: {
                  color: "rgba(100, 116, 139, 0.45)",
                  type: "dashed",
                  width: 1.5
                },
                data: [{ xAxis: anchorIndex }]
              }
            : undefined,
        markPoint:
          anchorIndex >= 0 && typeof anchorValue === "number"
            ? {
                symbol: "circle",
                symbolSize: 11,
                label: {
                  show: false
                },
                itemStyle: {
                  color: "#111827",
                  borderColor: "#f8fafc",
                  borderWidth: 2
                },
                data: [
                  {
                    name: "Shock Anchor",
                    coord: [anchorIndex, anchorValue],
                    value: anchorValue
                  }
                ]
              }
            : undefined
      },
      {
        name: "Poll Average",
        type: "line",
        smooth: true,
        symbol: "circle",
        showSymbol: false,
        lineStyle: { width: 2, color: "#f97316", type: "dashed" },
        z: 3,
        connectNulls: true,
        data: pollData
      }
    ]
  };

  return <ReactECharts key={chartKey} option={option} notMerge style={{ height: 340 }} />;
}
