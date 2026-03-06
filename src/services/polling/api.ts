import type { PollPoint } from "@/types/poll";
import { getHistoricalPollSeries } from "@/services/polymarket/api";

export async function getPollingAverage(): Promise<PollPoint[]> {
  return getHistoricalPollSeries();
}
