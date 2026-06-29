import { calculateCorrelation } from "@/analytics/correlation";
import { calculateLeadLag } from "@/analytics/leadLag";
import { calculateVolatility } from "@/analytics/volatility";
import { withApiBase } from "@/services/api/base";
import type { AnalyticsSummaryResult } from "@/types/analytics";
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
  const gaps = marketValues.map((value, index) => Math.abs(value - (pollValues[index] ?? value)));
  const averageGap = gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : 0;
  const maxGap = gaps.length ? Math.max(...gaps) : 0;
  const currentGap = gaps.length ? gaps.at(-1) ?? 0 : 0;
  const rollingWindow = Math.min(30, length);

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
