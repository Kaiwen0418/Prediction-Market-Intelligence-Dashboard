import type { TimePoint } from "@/types/market";
import type { VolatilityResult } from "@/types/analytics";
import { mean, standardDeviation } from "@/utils/math";

export function calculateVolatility(series: TimePoint[]): VolatilityResult {
  const returns = series.slice(1).map((point, index) => point.value - series[index].value);
  return {
    realizedVolatility: Number((standardDeviation(returns) * Math.sqrt(365) * 100).toFixed(2)),
    averageReturn: Number((mean(returns) * 100).toFixed(2))
  };
}
