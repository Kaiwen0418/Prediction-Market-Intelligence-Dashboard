"use client";

import type { EChartsOption } from "echarts";
import type { OrderbookState } from "@/types/market";
import { ReactECharts } from "./ChartContainer";

type DepthChartProps = {
  orderbook: OrderbookState;
};

function cumulative(levels: { price: number; size: number }[]) {
  let running = 0;
  return levels.map((level) => {
    running += level.size;
    return [level.price, running];
  });
}

export function DepthChart({ orderbook }: DepthChartProps) {
  const bidDepth = cumulative([...orderbook.bids].sort((a, b) => a.price - b.price));
  const askDepth = cumulative([...orderbook.asks].sort((a, b) => a.price - b.price));

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
        lineStyle: { width: 3, color: "#14b8a6" },
        areaStyle: { color: "rgba(20, 184, 166, 0.14)" },
        data: bidDepth
      },
      {
        name: "Asks",
        type: "line",
        step: "start",
        showSymbol: false,
        lineStyle: { width: 3, color: "#f97316" },
        areaStyle: { color: "rgba(249, 115, 22, 0.12)" },
        data: askDepth
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
