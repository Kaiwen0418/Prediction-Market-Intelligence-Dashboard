import type { CorrelationResult, LeadLagResult, VolatilityResult } from "@/types/analytics";
import type { PollPoint } from "@/types/poll";
import type { TimePoint } from "@/types/market";

export type ResearchCase = {
  state: string;
  summary: string;
  marketSeries: TimePoint[];
  pollSeries: PollPoint[];
  leadLag: LeadLagResult;
  correlation: CorrelationResult;
  volatility: VolatilityResult;
};

function date(day: string) {
  return `${day}T00:00:00.000Z`;
}

const arizonaMarket = [0.47, 0.48, 0.49, 0.5, 0.5, 0.52, 0.53, 0.55, 0.56, 0.57];
const arizonaPoll = [0.47, 0.47, 0.48, 0.48, 0.49, 0.49, 0.5, 0.51, 0.52, 0.53];

const pennsylvaniaMarket = [0.49, 0.5, 0.5, 0.51, 0.52, 0.53, 0.53, 0.54, 0.55, 0.56];
const pennsylvaniaPoll = [0.49, 0.49, 0.49, 0.5, 0.5, 0.51, 0.51, 0.52, 0.53, 0.54];

const nevadaMarket = [0.5, 0.49, 0.5, 0.51, 0.52, 0.53, 0.55, 0.56, 0.56, 0.57];
const nevadaPoll = [0.5, 0.5, 0.5, 0.5, 0.51, 0.51, 0.52, 0.53, 0.53, 0.54];

const northCarolinaMarket = [0.53, 0.53, 0.53, 0.54, 0.53, 0.54, 0.54, 0.54, 0.55, 0.54];
const northCarolinaPoll = [0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53, 0.53];

function toSeries(values: number[]): TimePoint[] {
  const days = ["2024-09-08", "2024-09-15", "2024-09-22", "2024-09-29", "2024-10-06", "2024-10-13", "2024-10-20", "2024-10-27", "2024-11-03", "2024-11-05"];
  return values.map((value, index) => ({
    timestamp: date(days[index]),
    value
  }));
}

function toPollSeries(values: number[], source: string): PollPoint[] {
  const days = ["2024-09-08", "2024-09-15", "2024-09-22", "2024-09-29", "2024-10-06", "2024-10-13", "2024-10-20", "2024-10-27", "2024-11-03", "2024-11-05"];
  return values.map((pollAverage, index) => ({
    timestamp: date(days[index]),
    pollAverage,
    sampleSize: 0,
    source,
    fieldDateLabel: days[index],
    methodology: "Static research demo series"
  }));
}

export const researchCases: ResearchCase[] = [
  {
    state: "Arizona",
    summary: "Study reports one of the clearest early-signal cases, with strong alignment and meaningful lead time.",
    marketSeries: toSeries(arizonaMarket),
    pollSeries: toPollSeries(arizonaPoll, "FiveThirtyEight aggregate"),
    leadLag: {
      lagDays: 14,
      score: 0.988,
      interpretation: "Polymarket leads polling by 14 days in the study's strongest Arizona configuration"
    },
    correlation: {
      coefficient: 0.988,
      strength: "strong"
    },
    volatility: {
      realizedVolatility: 18.4,
      averageReturn: 0.67
    }
  },
  {
    state: "Pennsylvania",
    summary: "Another high-signal state where market pricing moved ahead of poll aggregation in the paper's framework.",
    marketSeries: toSeries(pennsylvaniaMarket),
    pollSeries: toPollSeries(pennsylvaniaPoll, "FiveThirtyEight aggregate"),
    leadLag: {
      lagDays: 10,
      score: 0.961,
      interpretation: "Market leads polling by roughly 10 days in the study's Pennsylvania setup"
    },
    correlation: {
      coefficient: 0.961,
      strength: "strong"
    },
    volatility: {
      realizedVolatility: 15.7,
      averageReturn: 0.54
    }
  },
  {
    state: "Nevada",
    summary: "The paper identifies Nevada as another strong lead-lag environment with visible pattern similarity.",
    marketSeries: toSeries(nevadaMarket),
    pollSeries: toPollSeries(nevadaPoll, "FiveThirtyEight aggregate"),
    leadLag: {
      lagDays: 12,
      score: 0.973,
      interpretation: "Market leads polling by roughly 12 days in the study's Nevada setup"
    },
    correlation: {
      coefficient: 0.973,
      strength: "strong"
    },
    volatility: {
      realizedVolatility: 17.1,
      averageReturn: 0.61
    }
  },
  {
    state: "North Carolina",
    summary: "Used as the low-signal counterexample: static polling environment and weak predictive opportunity.",
    marketSeries: toSeries(northCarolinaMarket),
    pollSeries: toPollSeries(northCarolinaPoll, "FiveThirtyEight aggregate"),
    leadLag: {
      lagDays: 0,
      score: 0.22,
      interpretation: "Low-signal environment; no meaningful polling shift for the market to anticipate"
    },
    correlation: {
      coefficient: 0.22,
      strength: "weak"
    },
    volatility: {
      realizedVolatility: 5.3,
      averageReturn: 0.08
    }
  }
];

export const researchDataSources = {
  paper: "https://www.mdpi.com/1999-5903/17/11/487",
  polymarket: "https://polymarket.com",
  fivethirtyeight: "https://abcnews.go.com/538"
};
