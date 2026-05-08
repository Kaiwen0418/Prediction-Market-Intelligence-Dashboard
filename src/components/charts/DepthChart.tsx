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
    return [level.price, running];
  });
}

export function DepthChart({
  askColor = "#9f5f71",
  bidColor = "#5c7ea6",
  height = 280,
  orderbook
}: DepthChartProps) {
  const bidDepth = cumulative([...orderbook.bids].sort((a, b) => b.price - a.price)).reverse();
  const askDepth = cumulative([...orderbook.asks].sort((a, b) => a.price - b.price));
  const visiblePrices = [...bidDepth, ...askDepth].map(([price]) => Number(price));
  const minPrice = visiblePrices.length ? Math.min(...visiblePrices) : 0;
  const maxPrice = visiblePrices.length ? Math.max(...visiblePrices) : 1;
  const axisPadding = Math.max(orderbook.tickSize ?? 0.01, 0.005);

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis"
    },
    grid: {
      left: 32,
      right: 20,
      top: 20,
      bottom: 28,
      containLabel: true
    },
    xAxis: {
      type: "value",
      min: Number(Math.max(0, minPrice - axisPadding).toFixed(3)),
      max: Number((maxPrice + axisPadding).toFixed(3)),
      axisLabel: {
        formatter: (value: number) => value.toFixed(2)
      }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } }
    },
    series: [
      {
        name: "Bids",
        type: "line",
        step: "end",
        showSymbol: false,
        lineStyle: { width: 3, color: bidColor },
        areaStyle: { color: `${bidColor}26` },
        data: bidDepth
      },
      {
        name: "Asks",
        type: "line",
        step: "start",
        showSymbol: false,
        lineStyle: { width: 3, color: askColor },
        areaStyle: { color: `${askColor}22` },
        data: askDepth
      }
    ]
  };

  return <ReactECharts option={option} style={{ height }} />;
}
