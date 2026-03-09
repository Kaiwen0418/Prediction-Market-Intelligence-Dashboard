import { calculateCorrelation } from "@/analytics/correlation";
import { calculateLeadLag } from "@/analytics/leadLag";
import { calculateVolatility } from "@/analytics/volatility";
import type { CorrelationResult, LeadLagResult, VolatilityResult } from "@/types/analytics";
import type { PollPoint } from "@/types/poll";
import type { TimePoint } from "@/types/market";
import { useDataSourceStore } from "@/stores/dataSourceStore";

type StatePartySupportDataset = {
  generatedAt: string;
  sourceUrl: string;
  description: string;
  states: Array<{
    state: string;
    series: Array<{
      date: string;
      democrat?: number;
      republican?: number;
    }>;
  }>;
};

type StaticPolymarketHistoryDataset = {
  generatedAt: string;
  sourceUrls: {
    gamma: string;
    clob: string;
  };
  description: string;
  states: Array<{
    state: string;
    eventSlug: string;
    parties: {
      Republican: {
        marketId: string;
        tokenId: string;
        title: string;
        outcomeLabel?: string;
        contractLabel?: string;
        series: TimePoint[];
      } | null;
      Democrat: {
        marketId: string;
        tokenId: string;
        title: string;
        outcomeLabel?: string;
        contractLabel?: string;
        series: TimePoint[];
      } | null;
    };
  }>;
};

export type LiveHistoryCase = {
  state: string;
  eventSlug: string;
  party: "Democrat" | "Republican";
  summary: string;
  marketSeries: TimePoint[];
  pollSeries: PollPoint[];
  leadLag: LeadLagResult;
  correlation: CorrelationResult;
  volatility: VolatilityResult;
  sourceUrls: string[];
};

const STATE_SUPPORT_PUBLIC_URL = "/data/state-party-support-2024.json";
const POLYMARKET_HISTORY_PUBLIC_URL = "/data/polymarket-history-2024.json";

const stateRegistry = [
  {
    state: "Arizona",
    eventSlug: "arizona-presidential-election-winner",
    pollStateCode: "Arizona",
    pollLabel: "Republican"
  },
  {
    state: "Georgia",
    eventSlug: "georgia-presidential-election-winner",
    pollStateCode: "Georgia",
    pollLabel: "Republican"
  },
  {
    state: "Michigan",
    eventSlug: "michigan-presidential-election-winner",
    pollStateCode: "Michigan",
    pollLabel: "Republican"
  },
  {
    state: "Pennsylvania",
    eventSlug: "pennsylvania-presidential-election-winner",
    pollStateCode: "Pennsylvania",
    pollLabel: "Republican"
  },
  {
    state: "Wisconsin",
    eventSlug: "wisconsin-presidential-election-winner",
    pollStateCode: "Wisconsin",
    pollLabel: "Republican"
  }
] as const;

function normalizePollJson(
  dataset: StatePartySupportDataset,
  state: string,
  party: "Democrat" | "Republican"
): PollPoint[] {
  const stateData = dataset.states.find((entry) => entry.state === state);
  if (!stateData) return [];

  return stateData.series.flatMap((point) => {
    const support = party === "Republican" ? point.republican : point.democrat;
    if (typeof support !== "number") {
      return [];
    }

    return {
      timestamp: new Date(point.date).toISOString(),
      pollAverage: support,
      sampleSize: 0,
      source: "FiveThirtyEight cleaned public dataset",
      sourceUrl: "https://github.com/kevin-claw-agent/poll-data",
      fieldDateLabel: point.date,
      methodology: "Daily mean across all available 538 poll rows for the same state, date, and party",
      candidate: party
    };
  });
}

async function fetchPollDataset() {
  const response = await fetch(STATE_SUPPORT_PUBLIC_URL, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Polling JSON request failed: ${response.status}`);
  }

  return (await response.json()) as StatePartySupportDataset;
}

function historySourceKey(state: string, party: "Democrat" | "Republican") {
  return `history:${state}:${party}`;
}

function describeRange(series: Array<{ timestamp: string }>) {
  if (!series.length) return "none";
  return `${series[0].timestamp} -> ${series.at(-1)?.timestamp ?? series[0].timestamp}`;
}

async function fetchPolymarketHistoryDataset() {
  const response = await fetch(POLYMARKET_HISTORY_PUBLIC_URL, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Polymarket history JSON request failed: ${response.status}`);
  }

  return (await response.json()) as StaticPolymarketHistoryDataset;
}

export async function getLiveHistoryCases(party: "Democrat" | "Republican" = "Republican"): Promise<LiveHistoryCase[]> {
  let dataset: StatePartySupportDataset | null = null;
  let polymarketHistoryDataset: StaticPolymarketHistoryDataset | null = null;
  try {
    [dataset, polymarketHistoryDataset] = await Promise.all([
      fetchPollDataset(),
      fetchPolymarketHistoryDataset()
    ]);
  } catch {
    stateRegistry.forEach((stateCase) => {
      useDataSourceStore.getState().markFallback(historySourceKey(stateCase.state, party), {
        stage: "reachability",
        message: "Failed to fetch cleaned public polling or Polymarket history dataset"
      });
    });
    return [];
  }

  const cases = await Promise.all(
    stateRegistry.map(async (stateCase) => {
      useDataSourceStore.getState().markPending(historySourceKey(stateCase.state, party));

      const pollSeries = normalizePollJson(dataset, stateCase.pollStateCode, party);
      const stateHistory = polymarketHistoryDataset.states.find((entry) => entry.state === stateCase.state) ?? null;
      const market = stateHistory?.parties[party] ?? null;
      const marketSeries = market?.series ?? [];
      const pollRange = describeRange(pollSeries);
      const marketRange = describeRange(marketSeries);

      console.info("[history]", {
        state: stateCase.state,
        party,
        eventSlug: stateCase.eventSlug,
        matchedOutcome: market?.outcomeLabel ?? null,
        matchedContract: market?.contractLabel ?? null,
        marketId: market?.marketId ?? null,
        tokenId: market?.tokenId ?? null,
        pollPoints: pollSeries.length,
        pollRange,
        marketPoints: marketSeries.length,
        marketRange,
        staticHistoryGeneratedAt: polymarketHistoryDataset.generatedAt
      });

      if (pollSeries.length > 1 && marketSeries.length > 1) {
        useDataSourceStore.getState().markCurated(historySourceKey(stateCase.state, party));
      } else {
        const detailedMessage =
          pollSeries.length <= 1
            ? `Public cleaned polling dataset did not have enough usable rows. party=${party}, pollPoints=${pollSeries.length}, pollRange=${pollRange}`
            : `Static Polymarket history dataset did not have enough points for the matched event outcome. party=${party}, outcome=${market?.outcomeLabel ?? "unknown"}, contract=${market?.contractLabel ?? "unknown"}, marketId=${market?.marketId ?? "unknown"}, token=${market?.tokenId ?? "unknown"}, marketPoints=${marketSeries.length}, marketRange=${marketRange}`;
        useDataSourceStore.getState().markFallback(historySourceKey(stateCase.state, party), {
          stage: "normalization",
          message: detailedMessage
        });
      }

      return {
        state: stateCase.state,
        eventSlug: stateCase.eventSlug,
        party,
        summary: `FiveThirtyEight ${party} state support matched against a pre-fetched Polymarket history snapshot for ${stateCase.state}.`,
        marketSeries,
        pollSeries,
        leadLag: calculateLeadLag(marketSeries, pollSeries),
        correlation: calculateCorrelation(marketSeries, pollSeries),
        volatility: calculateVolatility(marketSeries),
        sourceUrls: [
          STATE_SUPPORT_PUBLIC_URL,
          POLYMARKET_HISTORY_PUBLIC_URL
        ]
      };
    })
  );

  return cases.filter((item) => item.marketSeries.length > 1 && item.pollSeries.length > 1);
}
