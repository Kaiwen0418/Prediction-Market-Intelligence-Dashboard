import type { PollPoint } from "@/types/poll";
import type { MarketSnapshot } from "@/types/market";
import { useDataSourceStore } from "@/stores/dataSourceStore";
import { getHistoricalPollSeries } from "@/services/polymarket/api";
import { getTexasGopSenatePolls } from "./texasGopSenate";
import { validatePollingMarketCompatibility } from "./preflight";

export async function getPollingAverage(market?: MarketSnapshot | null): Promise<PollPoint[]> {
  const compatibilityIssue = validatePollingMarketCompatibility(market);

  if (!compatibilityIssue && market?.slug === "texas-republican-senate-primary-winner") {
    const polls = getTexasGopSenatePolls(market);
    if (polls.length) {
      useDataSourceStore.getState().markCurated("polling");
      return polls;
    }
    useDataSourceStore.getState().markFallback("polling", {
      stage: "normalization",
      message: "Curated polling source exists but no candidate series matched the current outcome label"
    });
    return getHistoricalPollSeries();
  }

  if (compatibilityIssue) {
    useDataSourceStore.getState().markFallback("polling", compatibilityIssue);
  } else {
    useDataSourceStore.getState().markFallback("polling", {
      stage: "reachability",
      message: "Polling adapter is still mocked; live polling source has not been integrated yet"
    });
  }

  return getHistoricalPollSeries();
}
