import type { TimelineEvent } from "@/types/market";
import { useDataSourceStore } from "@/stores/dataSourceStore";
import { timelineEvents } from "@/services/polymarket/mockData";

export async function getNewsEvents(): Promise<TimelineEvent[]> {
  useDataSourceStore.getState().markFallback("news", {
    stage: "reachability",
    message: "News/event feed is still mocked; live event source has not been integrated yet"
  });
  return timelineEvents;
}
