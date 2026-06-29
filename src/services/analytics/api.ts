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
  return {
    leadLag: calculateLeadLag(marketSeries, pollSeries),
    correlation: calculateCorrelation(marketSeries, pollSeries),
    volatility: calculateVolatility(marketSeries),
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
