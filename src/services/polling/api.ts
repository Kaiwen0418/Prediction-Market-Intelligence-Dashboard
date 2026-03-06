import type { PollPoint } from "@/types/poll";
import { useDataSourceStore } from "@/stores/dataSourceStore";
import { getHistoricalPollSeries } from "@/services/polymarket/api";

export async function getPollingAverage(): Promise<PollPoint[]> {
  useDataSourceStore.getState().markFallback("polling", {
    stage: "reachability",
    message: "Polling adapter is still mocked; live polling source has not been integrated yet"
  });
  return getHistoricalPollSeries();
}
