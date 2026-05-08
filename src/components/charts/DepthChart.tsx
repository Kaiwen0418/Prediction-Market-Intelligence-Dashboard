"use client";

import type { EChartsOption } from "echarts";
import type { OrderbookState } from "@/types/market";
import { ReactECharts } from "./ChartContainer";

type DepthChartProps = {
  askColor?: string;
  bidColor?: string;
  height?: number;
  orderbook: OrderbookState;
};

function cumulative(levels: { price: number; size: number }[]) {
  let running = 0;
  return levels.map((level) => {
    running += level.size;
    return [running, level.price];
  });
}

function compactDepth(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${Math.round(value)}`;
}

export function DepthChart({
  askColor = "#9f5f71",
  bidColor = "#5c7ea6",
  height = 280,
  orderbook
}: DepthChartProps) {
  const bidDepth = cumulative([...orderbook.bids].sort((a, b) => b.price - a.price));
  const askDepth = cumulative([...orderbook.asks].sort((a, b) => a.price - b.price));
  const visiblePrices = [...bidDepth, ...askDepth].map(([, price]) => Number(price));
  const minPrice = visiblePrices.length ? Math.min(...visiblePrices) : 0;
  const maxPrice = visiblePrices.length ? Math.max(...visiblePrices) : 1;
  const axisPadding = Math.max(orderbook.tickSize ?? 0.01, 0.005);

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => compactDepth(Number(value))
    },
    grid: {
      left: 16,
      right: 16,
      top: 16,
      bottom: 24,
      containLabel: true
    },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => compactDepth(value)
      },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } }
    },
    yAxis: {
      type: "value",
      min: Number(Math.max(0, minPrice - axisPadding).toFixed(3)),
      max: Number((maxPrice + axisPadding).toFixed(3)),
      axisLabel: {
        formatter: (value: number) => value.toFixed(2)
      },
      splitLine: { show: false }
    },
    series: [
      {
        name: "Bids",
        type: "line",
        showSymbol: false,
        lineStyle: { width: 2.5, color: bidColor },
        // Bids span the lower price range; default origin fills downward toward y=0,
        // sitting cleanly below the bid line.
        areaStyle: { color: `${bidColor}26` },
        data: bidDepth
      },
      {
        name: "Asks",
        type: "line",
        showSymbol: false,
        lineStyle: { width: 2.5, color: askColor },
        // Asks span the upper price range; fill upward toward y=max so the red shading
        // hugs the line from above and never bleeds into the bid region.
        areaStyle: { color: `${askColor}22`, origin: "end" },
        data: askDepth
      }
    ]
  };

  return <ReactECharts option={option} style={{ height }} />;
}
