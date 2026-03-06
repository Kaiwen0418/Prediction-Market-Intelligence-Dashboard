import type { CorrelationResult } from "@/types/analytics";
import type { TimePoint } from "@/types/market";
import type { PollPoint } from "@/types/poll";

export function calculateCorrelation(market: TimePoint[], polls: PollPoint[]): CorrelationResult {
  const length = Math.min(market.length, polls.length);
  if (length < 2) {
    return { coefficient: 0, strength: "weak" };
  }

  const marketValues = market.slice(-length).map((point) => point.value);
  const pollValues = polls.slice(-length).map((point) => point.pollAverage);
  const meanMarket = marketValues.reduce((sum, value) => sum + value, 0) / length;
  const meanPoll = pollValues.reduce((sum, value) => sum + value, 0) / length;

  let numerator = 0;
  let denominatorMarket = 0;
  let denominatorPoll = 0;

  for (let index = 0; index < length; index += 1) {
    const marketDiff = marketValues[index] - meanMarket;
    const pollDiff = pollValues[index] - meanPoll;
    numerator += marketDiff * pollDiff;
    denominatorMarket += marketDiff ** 2;
    denominatorPoll += pollDiff ** 2;
  }

  const coefficient =
    denominatorMarket && denominatorPoll ? numerator / Math.sqrt(denominatorMarket * denominatorPoll) : 0;
  const absolute = Math.abs(coefficient);
  const strength = absolute > 0.75 ? "strong" : absolute > 0.4 ? "moderate" : "weak";

  return {
    coefficient: Number(coefficient.toFixed(3)),
    strength
  };
}
