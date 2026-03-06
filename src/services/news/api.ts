import type { TimelineEvent } from "@/types/market";
import { getTimelineEvents } from "@/services/polymarket/api";

export async function getNewsEvents(): Promise<TimelineEvent[]> {
  return getTimelineEvents();
}
