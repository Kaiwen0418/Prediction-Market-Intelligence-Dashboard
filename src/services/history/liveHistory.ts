import { calculateCorrelation } from "@/analytics/correlation";
import { calculateLeadLag } from "@/analytics/leadLag";
import { calculateVolatility } from "@/analytics/volatility";
import type { CorrelationResult, LeadLagResult, VolatilityResult } from "@/types/analytics";
import type { PollPoint } from "@/types/poll";
import type { TimePoint } from "@/types/market";
import { useDataSourceStore } from "@/stores/dataSourceStore";
import { fetchEventMarketBySlug, fetchPriceHistoryLive } from "@/services/polymarket/rest";

type StatePartySupportDataset = {
  generatedAt: string;
  sourceUrl: string;
  description: string;
  states: Array<{
    state: string;
    series: Array<{
      date: string;
      democrat: number;
      republican: number;
    }>;
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

  return stateData.series.map((point) => ({
    timestamp: new Date(point.date).toISOString(),
    pollAverage: party === "Republican" ? point.republican : point.democrat,
    sampleSize: 0,
    source: "FiveThirtyEight cleaned public dataset",
    sourceUrl:
      "https://github.com/fivethirtyeight/data/blob/master/polls/2024-averages/presidential_general_averages_2024-09-12_uncorrected.csv",
    fieldDateLabel: point.date,
    methodology: "Local cleaned public resource from 538 daily averages",
    candidate: party
  }));
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

async function fetchMarketDebug(slug: string) {
  const response = await fetch(`/api/polymarket/debug-market?slug=${encodeURIComponent(slug)}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function fetchPriceHistoryDebug(tokenId: string) {
  const response = await fetch(`/api/polymarket/price-history?market=${encodeURIComponent(tokenId)}&debug=1`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function historySourceKey(state: string, party: "Democrat" | "Republican") {
  return `history:${state}:${party}`;
}

function describeRange(series: Array<{ timestamp: string }>) {
  if (!series.length) return "none";
  return `${series[0].timestamp} -> ${series.at(-1)?.timestamp ?? series[0].timestamp}`;
}

function preferredOutcomeLabelsForParty(party: "Democrat" | "Republican") {
  return party === "Republican"
    ? [
        "Donald Trump",
        "Trump",
        "Donald J. Trump",
        "Republican"
      ]
    : [
        "Kamala Harris",
        "Harris",
        "Kamala D. Harris",
        "Democrat",
        "Democratic"
      ];
}

export async function getLiveHistoryCases(party: "Democrat" | "Republican" = "Republican"): Promise<LiveHistoryCase[]> {
  let dataset: StatePartySupportDataset | null = null;
  try {
    dataset = await fetchPollDataset();
  } catch {
    stateRegistry.forEach((stateCase) => {
      useDataSourceStore.getState().markFallback(historySourceKey(stateCase.state, party), {
        stage: "reachability",
        message: "Failed to fetch cleaned public polling dataset"
      });
    });
    return [];
  }

  const cases = await Promise.all(
    stateRegistry.map(async (stateCase) => {
      useDataSourceStore.getState().markPending(historySourceKey(stateCase.state, party));

      const pollSeries = normalizePollJson(dataset, stateCase.pollStateCode, party);
      const preferredOutcomeLabels = preferredOutcomeLabelsForParty(party);
      const market = await fetchEventMarketBySlug(stateCase.eventSlug, preferredOutcomeLabels).catch(() => null);
      const historyMarketKey = market?.tokenId ?? market?.marketId;
      const marketSeries = historyMarketKey ? await fetchPriceHistoryLive(historyMarketKey).catch(() => []) : [];
      const marketDebug = await fetchMarketDebug(stateCase.eventSlug).catch(() => null);
      const priceHistoryDebug = historyMarketKey ? await fetchPriceHistoryDebug(historyMarketKey).catch(() => null) : null;
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
        historyMarketKey,
        pollPoints: pollSeries.length,
        pollRange,
        marketPoints: marketSeries.length,
        marketRange,
        marketDebug,
        priceHistoryDebug
      });

      if (pollSeries.length > 1 && marketSeries.length > 1) {
        useDataSourceStore.getState().markLive(historySourceKey(stateCase.state, party));
      } else {
        const detailedMessage =
          pollSeries.length <= 1
            ? `Public cleaned polling dataset did not have enough usable rows. party=${party}, pollPoints=${pollSeries.length}, pollRange=${pollRange}`
            : `Polymarket history did not return enough points for the matched event outcome. party=${party}, outcome=${market?.outcomeLabel ?? "unknown"}, contract=${market?.contractLabel ?? "unknown"}, marketId=${market?.marketId ?? "unknown"}, token=${market?.tokenId ?? "unknown"}, historyKey=${historyMarketKey ?? "unknown"}, marketPoints=${marketSeries.length}, marketRange=${marketRange}`;
        useDataSourceStore.getState().markFallback(historySourceKey(stateCase.state, party), {
          stage: "normalization",
          message: detailedMessage
        });
      }

      return {
        state: stateCase.state,
        eventSlug: stateCase.eventSlug,
        party,
        summary: `FiveThirtyEight ${party} state support matched against Polymarket history for ${stateCase.state} using clobTokenIds[0] with all-interval history at fidelity 720.`,
        marketSeries,
        pollSeries,
        leadLag: calculateLeadLag(marketSeries, pollSeries),
        correlation: calculateCorrelation(marketSeries, pollSeries),
        volatility: calculateVolatility(marketSeries),
        sourceUrls: [
          STATE_SUPPORT_PUBLIC_URL,
          `https://polymarket.com/event/${stateCase.eventSlug}`
        ]
      };
    })
  );

  return cases.filter((item) => item.marketSeries.length > 1 && item.pollSeries.length > 1);
}
