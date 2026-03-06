import { calculateCorrelation } from "@/analytics/correlation";
import { calculateLeadLag } from "@/analytics/leadLag";
import { calculateVolatility } from "@/analytics/volatility";
import type { CorrelationResult, LeadLagResult, VolatilityResult } from "@/types/analytics";
import type { PollPoint } from "@/types/poll";
import type { TimePoint } from "@/types/market";
import { fetchEventMarketBySlug, fetchPriceHistoryLive } from "@/services/polymarket/rest";

export type LiveHistoryCase = {
  state: string;
  eventSlug: string;
  summary: string;
  marketSeries: TimePoint[];
  pollSeries: PollPoint[];
  leadLag: LeadLagResult;
  correlation: CorrelationResult;
  volatility: VolatilityResult;
  sourceUrls: string[];
};

const stateRegistry = [
  {
    state: "Arizona",
    eventSlug: "arizona-presidential-election-winner",
    pollStateCode: "Arizona"
  },
  {
    state: "Georgia",
    eventSlug: "georgia-presidential-election-winner",
    pollStateCode: "Georgia"
  },
  {
    state: "Michigan",
    eventSlug: "michigan-presidential-election-winner",
    pollStateCode: "Michigan"
  },
  {
    state: "Pennsylvania",
    eventSlug: "pennsylvania-presidential-election-winner",
    pollStateCode: "Pennsylvania"
  },
  {
    state: "Wisconsin",
    eventSlug: "wisconsin-presidential-election-winner",
    pollStateCode: "Wisconsin"
  }
] as const;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizePollCsv(text: string, state: string): PollPoint[] {
  const rows = parseCsv(text);
  const [headers, ...dataRows] = rows;
  if (!headers) return [];

  const columns = Object.fromEntries(headers.map((header, index) => [header, index]));

  return dataRows
    .filter((row) => row[columns.cycle] === "2024")
    .filter((row) => row[columns.state] === state)
    .filter((row) => row[columns.candidate_name] === "Kamala Harris")
    .map((row) => ({
      timestamp: new Date(row[columns.date]).toISOString(),
      pollAverage: Number(row[columns.pct_estimate]) / 100,
      sampleSize: 0,
      source: "FiveThirtyEight averages",
      sourceUrl:
        "https://github.com/fivethirtyeight/data/blob/master/polls/2024-averages/presidential_general_averages_2024-09-12_uncorrected.csv",
      fieldDateLabel: row[columns.date],
      methodology: "538 state average snapshot",
      candidate: row[columns.candidate_name]
    }))
    .filter((point) => Number.isFinite(point.pollAverage) && point.pollAverage > 0)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

async function fetchPollCsv() {
  const response = await fetch("/api/research/fivethirtyeight-presidential-averages", {
    headers: {
      Accept: "text/csv"
    }
  });

  if (!response.ok) {
    throw new Error(`Polling CSV request failed: ${response.status}`);
  }

  return response.text();
}

export async function getLiveHistoryCases(): Promise<LiveHistoryCase[]> {
  const csv = await fetchPollCsv();

  const cases = await Promise.all(
    stateRegistry.map(async (stateCase) => {
      const pollSeries = normalizePollCsv(csv, stateCase.pollStateCode);
      const market = await fetchEventMarketBySlug(stateCase.eventSlug, ["Kamala Harris", "Harris", "Democrat"]);
      const marketSeries = market?.tokenId ? await fetchPriceHistoryLive(market.tokenId) : [];

      return {
        state: stateCase.state,
        eventSlug: stateCase.eventSlug,
        summary: `FiveThirtyEight state averages matched against Polymarket history for ${stateCase.state}.`,
        marketSeries,
        pollSeries,
        leadLag: calculateLeadLag(marketSeries, pollSeries),
        correlation: calculateCorrelation(marketSeries, pollSeries),
        volatility: calculateVolatility(marketSeries),
        sourceUrls: [
          "https://github.com/fivethirtyeight/data/blob/master/polls/2024-averages/presidential_general_averages_2024-09-12_uncorrected.csv",
          `https://polymarket.com/event/${stateCase.eventSlug}`
        ]
      };
    })
  );

  return cases.filter((item) => item.marketSeries.length > 1 && item.pollSeries.length > 1);
}
