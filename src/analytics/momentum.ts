import type { MomentumResult } from "@/types/analytics";
import type { TimePoint } from "@/types/market";

export function calculateMomentum(series: TimePoint[]): MomentumResult {
  const latest = series.at(-1)?.value ?? 0;
  const dayAgo = series.at(-2)?.value ?? latest;
  const weekAgo = series.at(-8)?.value ?? latest;
  const oneDay = (latest - dayAgo) * 100;
  const sevenDay = (latest - weekAgo) * 100;
  const direction = oneDay > 0.15 ? "up" : oneDay < -0.15 ? "down" : "flat";

  return {
    oneDay: Number(oneDay.toFixed(2)),
    sevenDay: Number(sevenDay.toFixed(2)),
    direction
  };
}
