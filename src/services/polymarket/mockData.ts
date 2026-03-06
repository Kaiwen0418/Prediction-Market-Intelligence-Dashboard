import { subDays, subHours } from "date-fns";
import type { MarketSnapshot, OrderbookLevel, OrderbookState, TimelineEvent, TimePoint, TradePrint } from "@/types/market";
import type { PollPoint } from "@/types/poll";
import { polymarketConfig } from "./config";

const now = new Date();

const defaultFeaturedMarket: MarketSnapshot = {
  marketId: "pres-2028-winner",
  eventId: "event-pres-2028",
  tokenId: "token-pres-2028-yes",
  slug: "us-presidential-election-2028",
  eventSlug: "us-presidential-election-2028",
  title: "Will the incumbent party win the 2028 U.S. election?",
  category: "Politics",
  probability: 0.57,
  volume24h: 4_380_000,
  openInterest: 21_400_000,
  liquidity: 7_800_000,
  outcomeLabel: "Yes",
  updatedAt: now.toISOString()
};

const texasRepublicanSenatePrimaryMarket: MarketSnapshot = {
  marketId: "texas-republican-senate-primary-winner",
  eventId: "event-texas-gop-senate-primary",
  tokenId: "token-texas-gop-senate-paxton",
  slug: "texas-republican-senate-primary-winner",
  eventSlug: "texas-republican-senate-primary-winner",
  title: "Who will win the Texas Republican Senate primary?",
  category: "Politics",
  probability: 0.40,
  volume24h: 1_280_000,
  openInterest: 6_450_000,
  liquidity: 2_300_000,
  outcomeLabel: "Paxton",
  updatedAt: now.toISOString()
};

export function getMockFeaturedMarket(): MarketSnapshot {
  if (polymarketConfig.featuredMarketSlug === "texas-republican-senate-primary-winner") {
    return texasRepublicanSenatePrimaryMarket;
  }

  return defaultFeaturedMarket;
}

export const featuredMarket = getMockFeaturedMarket();

export const marketSeries: TimePoint[] = Array.from({ length: 30 }, (_, index) => {
  const timestamp = subDays(now, 29 - index).toISOString();
  const drift = 0.43 + index * 0.004;
  const oscillation = Math.sin(index / 3) * 0.03;
  return {
    timestamp,
    value: Number((drift + oscillation).toFixed(3))
  };
});

export const pollSeries: PollPoint[] = Array.from({ length: 30 }, (_, index) => {
  const timestamp = subDays(now, 29 - index).toISOString();
  const baseline = 0.45 + index * 0.0034;
  const oscillation = Math.sin((index - 2) / 3) * 0.022;
  return {
    timestamp,
    pollAverage: Number((baseline + oscillation).toFixed(3)),
    sampleSize: 1200 + index * 15,
    source: "Composite Polling Avg"
  };
});

function generateSide(start: number, direction: 1 | -1): OrderbookLevel[] {
  return Array.from({ length: 12 }, (_, index) => ({
    price: Number((start + direction * index * 0.01).toFixed(2)),
    size: Math.round(400 + Math.random() * 3200)
  })).sort((a, b) => (direction === -1 ? b.price - a.price : a.price - b.price));
}

export function createOrderbookSnapshot(): OrderbookState {
  const market = getMockFeaturedMarket();
  const bids = generateSide(0.56, -1);
  const asks = generateSide(0.58, 1);
  const trades: TradePrint[] = Array.from({ length: 20 }, (_, index) => ({
    id: `trade-${index}`,
    side: index % 3 === 0 ? ("sell" as const) : ("buy" as const),
    price: Number((0.55 + Math.random() * 0.04).toFixed(2)),
    size: Math.round(100 + Math.random() * 1500),
    timestamp: subHours(now, 20 - index).toISOString()
  })).reverse();

  return {
    marketId: market.marketId,
    tokenId: market.tokenId,
    bids,
    asks,
    trades,
    spread: Number((asks[0].price - bids[0].price).toFixed(2)),
    midPrice: Number((((asks[0].price + bids[0].price) / 2)).toFixed(3)),
    tickSize: 0.01,
    source: "mock",
    updatedAt: now.toISOString()
  };
}

export const timelineEvents: TimelineEvent[] = [
  {
    id: "event-1",
    timestamp: subDays(now, 6).toISOString(),
    headline: "Major swing-state poll shifts toward incumbent coalition",
    source: "Polling Consortium",
    category: "poll",
    impactScore: 78,
    marketMove: 3.4,
    summary: "Polling composite narrowed in two decisive states and the market repriced within hours."
  },
  {
    id: "event-2",
    timestamp: subDays(now, 4).toISOString(),
    headline: "Economic surprise prints below expectations",
    source: "Macro Calendar",
    category: "macro",
    impactScore: 65,
    marketMove: -1.8,
    summary: "Risk sentiment weakened and contracts briefly sold off before stabilizing."
  },
  {
    id: "event-3",
    timestamp: subDays(now, 2).toISOString(),
    headline: "Debate performance triggers aggressive overnight buy flow",
    source: "Event Monitor",
    category: "debate",
    impactScore: 89,
    marketMove: 4.9,
    summary: "Trade pressure flipped positive and best bid depth doubled during the session."
  }
];
