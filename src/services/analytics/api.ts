import { calculateCorrelation } from "@/analytics/correlation";
import { calculateLeadLag } from "@/analytics/leadLag";
import { calculateVolatility } from "@/analytics/volatility";
import { withApiBase } from "@/services/api/base";
import type { AnalyticsSummaryResult, ShockWindowSummaryResult } from "@/types/analytics";
import type { TimePoint } from "@/types/market";
import type { PollPoint } from "@/types/poll";

type NumericPoint = {
  timestamp: string;
  value: number;
};

type AnalyticsSummaryPayload = {
  market: NumericPoint[];
  polling: NumericPoint[];
  maxLagDays?: number;
};

function toPayload(marketSeries: TimePoint[], pollSeries: PollPoint[]): AnalyticsSummaryPayload {
  return {
    market: marketSeries.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    })),
    polling: pollSeries.map((point) => ({
      timestamp: point.timestamp,
      value: point.pollAverage,
    })),
    maxLagDays: 7,
  };
}

function fallbackAnalytics(marketSeries: TimePoint[], pollSeries: PollPoint[]): AnalyticsSummaryResult {
  const length = Math.min(marketSeries.length, pollSeries.length);
  const marketValues = marketSeries.slice(0, length).map((point) => point.value);
  const pollValues = pollSeries.slice(0, length).map((point) => point.pollAverage);
  const alignedTimestamps = marketSeries.slice(0, length).map((point) => point.timestamp);
  const gaps = marketValues.map((value, index) => Math.abs(value - (pollValues[index] ?? value)));
  const averageGap = gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : 0;
  const maxGap = gaps.length ? Math.max(...gaps) : 0;
  const currentGap = gaps.length ? gaps.at(-1) ?? 0 : 0;
  const rollingWindow = Math.min(30, length);
  const eventAnchorIndex =
    marketValues.length > 1
      ? marketValues
          .slice(1)
          .map((value, index) => Math.abs(value - marketValues[index]))
          .reduce(
            (bestIndex, current, index, deltas) =>
              current > deltas[bestIndex] ? index : bestIndex,
            0,
          ) + 1
      : 0;
  const preIndex = Math.max(0, eventAnchorIndex - 3);
  const postIndex = Math.min(Math.max(marketValues.length - 1, 0), eventAnchorIndex + 3);
  const preBase = marketValues[preIndex] ?? 0;
  const anchorValue = marketValues[eventAnchorIndex] ?? 0;
  const postValue = marketValues[postIndex] ?? anchorValue;

  return {
    leadLag: calculateLeadLag(marketSeries, pollSeries),
    correlation: calculateCorrelation(marketSeries, pollSeries),
    volatility: calculateVolatility(marketSeries),
    divergence: {
      averageGap: Number((averageGap * 100).toFixed(2)),
      maxGap: Number((maxGap * 100).toFixed(2)),
      currentGap: Number((currentGap * 100).toFixed(2)),
    },
    rollingCorrelation: {
      coefficient:
        rollingWindow >= 2
          ? calculateCorrelation(
              marketSeries.slice(-rollingWindow),
              pollSeries.slice(-rollingWindow),
            ).coefficient
          : 0,
      windowSize: rollingWindow || 1,
      points:
        rollingWindow >= 2
          ? alignedTimestamps.slice(rollingWindow - 1).map((timestamp, index) => ({
              timestamp,
              coefficient: calculateCorrelation(
                marketSeries.slice(index, index + rollingWindow),
                pollSeries.slice(index, index + rollingWindow),
              ).coefficient,
            }))
          : [],
    },
    eventWindow: {
      anchorIndex: eventAnchorIndex,
      anchorTimestamp: marketSeries[eventAnchorIndex]?.timestamp ?? "",
      preChange: Number(((anchorValue - preBase) * 100).toFixed(2)),
      postChange: Number(((postValue - anchorValue) * 100).toFixed(2)),
      netMove: Number(((postValue - preBase) * 100).toFixed(2)),
      preWindow: 3,
      postWindow: 3,
    },
  };
}

export async function getAnalyticsSummary(
  marketSeries: TimePoint[],
  pollSeries: PollPoint[],
): Promise<{ source: "api" | "local"; summary: AnalyticsSummaryResult }> {
  if (marketSeries.length < 2 || pollSeries.length < 2) {
    return {
      source: "local",
      summary: fallbackAnalytics(marketSeries, pollSeries),
    };
  }

  const apiUrl = withApiBase("/api/analytics/summary");
  if (apiUrl === "/api/analytics/summary") {
    return {
      source: "local",
      summary: fallbackAnalytics(marketSeries, pollSeries),
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(toPayload(marketSeries, pollSeries)),
    });

    if (!response.ok) {
      throw new Error(`Analytics summary request failed: ${response.status}`);
    }

    const summary = (await response.json()) as AnalyticsSummaryResult;
    return { source: "api", summary };
  } catch {
    return {
      source: "local",
      summary: fallbackAnalytics(marketSeries, pollSeries),
    };
  }
}

function fallbackShockWindows(marketSeries: TimePoint[], windowSize = 7, topK = 3): ShockWindowSummaryResult {
  const effectiveWindow = Math.min(windowSize, marketSeries.length);
  if (marketSeries.length < 2) {
    return { windowSize: effectiveWindow, topK, windows: [] };
  }

  const ranked = Array.from({ length: marketSeries.length - effectiveWindow + 1 }, (_, offset) => {
    const window = marketSeries.slice(offset, offset + effectiveWindow);
    const returns = window.slice(1).map((point, index) => point.value - window[index].value);
    const avg = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
    const variance =
      returns.length > 1
        ? returns.reduce((sum, value) => sum + (value - avg) ** 2, 0) / returns.length
        : 0;
    const localVolatility = Math.sqrt(variance) * Math.sqrt(365) * 100;
    const netMove = (window.at(-1)?.value ?? 0) - (window[0]?.value ?? 0);
    return {
      anchorIndex: offset + effectiveWindow - 1,
      anchorTimestamp: window.at(-1)?.timestamp ?? "",
      startTimestamp: window[0]?.timestamp ?? "",
      endTimestamp: window.at(-1)?.timestamp ?? "",
      netMove: Number((netMove * 100).toFixed(2)),
      absoluteMove: Number((Math.abs(netMove) * 100).toFixed(2)),
      localVolatility: Number(localVolatility.toFixed(2)),
    };
  });

  ranked.sort((left, right) => right.absoluteMove - left.absoluteMove || right.localVolatility - left.localVolatility);
  return {
    windowSize: effectiveWindow,
    topK,
    windows: ranked.slice(0, topK),
  };
}

export async function getShockWindows(
  marketSeries: TimePoint[],
  windowSize = 7,
  topK = 3,
): Promise<{ source: "api" | "local"; summary: ShockWindowSummaryResult }> {
  if (marketSeries.length < 2) {
    return {
      source: "local",
      summary: fallbackShockWindows(marketSeries, windowSize, topK),
    };
  }

  const apiUrl = withApiBase("/api/analytics/shock-windows");
  if (apiUrl === "/api/analytics/shock-windows") {
    return {
      source: "local",
      summary: fallbackShockWindows(marketSeries, windowSize, topK),
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        series: marketSeries.map((point) => ({ timestamp: point.timestamp, value: point.value })),
        windowSize,
        topK,
      }),
    });

    if (!response.ok) {
      throw new Error(`Shock windows request failed: ${response.status}`);
    }

    const summary = (await response.json()) as ShockWindowSummaryResult;
    return { source: "api", summary };
  } catch {
    return {
      source: "local",
      summary: fallbackShockWindows(marketSeries, windowSize, topK),
    };
  }
}
