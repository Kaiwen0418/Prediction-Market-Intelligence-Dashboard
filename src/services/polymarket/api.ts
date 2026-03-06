import type { MarketSnapshot, OrderbookState, TimelineEvent, TimePoint } from "@/types/market";
import type { PollPoint } from "@/types/poll";
import { createOrderbookSnapshot, featuredMarket, marketSeries, pollSeries, timelineEvents } from "./mockData";

function simulateLatency<T>(payload: T, delay = 250): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(payload), delay);
  });
}

export async function getFeaturedMarket(): Promise<MarketSnapshot> {
  return simulateLatency(featuredMarket);
}

export async function getHistoricalMarketSeries(): Promise<TimePoint[]> {
  return simulateLatency(marketSeries);
}

export async function getHistoricalPollSeries(): Promise<PollPoint[]> {
  return simulateLatency(pollSeries);
}

export async function getOrderbookSnapshot(): Promise<OrderbookState> {
  return simulateLatency(createOrderbookSnapshot(), 180);
}

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  return simulateLatency(timelineEvents);
}
