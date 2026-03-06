import type { TimePoint } from "@/types/market";
import type { PollPoint } from "@/types/poll";
import type { LeadLagResult } from "@/types/analytics";

function correlation(seriesA: number[], seriesB: number[]) {
  const length = Math.min(seriesA.length, seriesB.length);
  if (length < 2) return 0;

  const a = seriesA.slice(0, length);
  const b = seriesB.slice(0, length);
  const meanA = a.reduce((sum, value) => sum + value, 0) / length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / length;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let index = 0; index < length; index += 1) {
    const centeredA = a[index] - meanA;
    const centeredB = b[index] - meanB;
    numerator += centeredA * centeredB;
    denomA += centeredA ** 2;
    denomB += centeredB ** 2;
  }

  if (!denomA || !denomB) return 0;
  return numerator / Math.sqrt(denomA * denomB);
}

export function calculateLeadLag(market: TimePoint[], polls: PollPoint[], maxLagDays = 7): LeadLagResult {
  const marketValues = market.map((point) => point.value);
  const pollValues = polls.map((point) => point.pollAverage);

  let bestLag = 0;
  let bestScore = -Infinity;

  for (let lag = -maxLagDays; lag <= maxLagDays; lag += 1) {
    const shiftedMarket = lag >= 0 ? marketValues.slice(lag) : marketValues.slice(0, lag);
    const shiftedPolls = lag >= 0 ? pollValues.slice(0, pollValues.length - lag) : pollValues.slice(-lag);
    const score = correlation(shiftedMarket, shiftedPolls);

    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  const interpretation =
    bestLag > 0
      ? `Market leads polls by ${bestLag} day${bestLag === 1 ? "" : "s"}`
      : bestLag < 0
        ? `Polls lead market by ${Math.abs(bestLag)} day${bestLag === -1 ? "" : "s"}`
        : "Market and polling move in sync";

  return {
    lagDays: bestLag,
    score: Number(bestScore.toFixed(3)),
    interpretation
  };
}
