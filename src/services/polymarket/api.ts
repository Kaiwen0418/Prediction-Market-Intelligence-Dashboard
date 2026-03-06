import type { MarketSnapshot, OrderbookState, TimelineEvent, TimePoint } from "@/types/market";
import type { PollPoint } from "@/types/poll";
import { getNewsEvents } from "@/services/news/api";
import { fetchFeaturedMarketLive, fetchOrderbookLive, fetchPriceHistoryLive, fetchTradesLive } from "./rest";
import { featuredMarket, marketSeries, pollSeries } from "./mockData";
import { createOrderbookSnapshot } from "./mockData";
import { normalizeTimelineFromMarket } from "./normalizers";

function simulateLatency<T>(payload: T, delay = 200): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(payload), delay);
  });
}

export async function getFeaturedMarket(): Promise<MarketSnapshot> {
  const liveMarket = await fetchFeaturedMarketLive().catch(() => null);
  return liveMarket ?? simulateLatency(featuredMarket);
}

export async function getHistoricalMarketSeries(tokenId?: string): Promise<TimePoint[]> {
  if (!tokenId) return simulateLatency(marketSeries);

  const liveHistory = await fetchPriceHistoryLive(tokenId).catch(() => []);
  if (liveHistory.length > 1) return liveHistory;
  return simulateLatency(marketSeries);
}

export async function getHistoricalPollSeries(): Promise<PollPoint[]> {
  return simulateLatency(pollSeries);
}

export async function getOrderbookSnapshot(tokenId?: string): Promise<OrderbookState> {
  if (tokenId) {
    const liveOrderbook = await fetchOrderbookLive(tokenId).catch(() => null);
    if (liveOrderbook) {
      const liveTrades = await fetchTradesLive(tokenId).catch(() => []);
      return {
        ...liveOrderbook,
        trades: liveTrades.length ? liveTrades : liveOrderbook.trades
      };
    }
  }

  return simulateLatency(createOrderbookSnapshot(), 180);
}

export async function getTimelineEvents(market?: MarketSnapshot): Promise<TimelineEvent[]> {
  const events = await getNewsEvents().catch(() => []);
  if (events.length) return events;
  if (market) return normalizeTimelineFromMarket(market);
  return normalizeTimelineFromMarket(featuredMarket);
}
