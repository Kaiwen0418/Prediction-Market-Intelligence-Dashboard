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

const californiaGovernorElectionMarket: MarketSnapshot = {
  marketId: "california-governor-election-2026",
  eventId: "event-california-governor-2026",
  tokenId: "token-california-governor-becerra",
  slug: "california-governor-election-2026",
  eventSlug: "california-governor-election-2026",
  title: "California Governor Election Winner",
  category: "Politics",
  probability: 0.74,
  volume24h: 2_180_000,
  openInterest: 1_120_000,
  liquidity: 3_400_000,
  outcomeLabel: "Will Xavier Becerra win the California Governor Election in 2026?",
  updatedAt: now.toISOString()
};

const ukMarkets: MarketSnapshot[] = [
  {
    marketId: "scotland-independence-referendum",
    eventId: "event-scotland-independence-referendum",
    tokenId: "token-scotland-independence-yes",
    slug: "will-scotland-hold-an-independence-referendum-before-2030",
    eventSlug: "will-scotland-hold-an-independence-referendum-before-2030",
    title: "Scotland Independence Referendum Before 2030",
    category: "Politics",
    probability: 0.42,
    volume24h: 384_000,
    openInterest: 1_740_000,
    liquidity: 620_000,
    outcomeLabel: "Will Scotland hold an independence referendum before 2030?",
    updatedAt: now.toISOString()
  },
  {
    marketId: "next-london-mayoral-election",
    eventId: "event-next-london-mayoral-election",
    tokenId: "token-london-mayor-leading-outcome",
    slug: "next-london-mayoral-election-winner",
    eventSlug: "next-london-mayoral-election-winner",
    title: "Next London Mayoral Election Winner",
    category: "Politics",
    probability: 0.61,
    volume24h: 276_000,
    openInterest: 980_000,
    liquidity: 410_000,
    outcomeLabel: "Leading outcome in the next London mayoral election",
    updatedAt: now.toISOString()
  },
  {
    marketId: "welsh-parliament-most-seats",
    eventId: "event-welsh-parliament-most-seats",
    tokenId: "token-welsh-parliament-leading-outcome",
    slug: "welsh-parliament-election-most-seats",
    eventSlug: "welsh-parliament-election-most-seats",
    title: "Welsh Parliament Election Most Seats",
    category: "Politics",
    probability: 0.54,
    volume24h: 192_000,
    openInterest: 740_000,
    liquidity: 330_000,
    outcomeLabel: "Leading outcome for most seats in the Welsh Parliament election",
    updatedAt: now.toISOString()
  },
  {
    marketId: "northern-ireland-assembly-most-seats",
    eventId: "event-northern-ireland-assembly-most-seats",
    tokenId: "token-northern-ireland-leading-outcome",
    slug: "northern-ireland-assembly-election-most-seats",
    eventSlug: "northern-ireland-assembly-election-most-seats",
    title: "Northern Ireland Assembly Election Most Seats",
    category: "Politics",
    probability: 0.47,
    volume24h: 148_000,
    openInterest: 560_000,
    liquidity: 270_000,
    outcomeLabel: "Leading outcome for most seats in the Northern Ireland Assembly election",
    updatedAt: now.toISOString()
  }
];

const mockMarkets = [
  defaultFeaturedMarket,
  texasRepublicanSenatePrimaryMarket,
  californiaGovernorElectionMarket,
  ...ukMarkets
];

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function probabilityFromSlug(slug: string) {
  const hash = Array.from(slug).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return Number((0.35 + (hash % 31) / 100).toFixed(2));
}

export function getMockMarketBySlug(slug: string): MarketSnapshot {
  const configuredMarket = mockMarkets.find((market) => market.slug === slug);
  if (configuredMarket) {
    return {
      ...configuredMarket,
      venue: "Polymarket",
      updatedAt: new Date().toISOString()
    };
  }

  const title = titleFromSlug(slug);
  return {
    ...defaultFeaturedMarket,
    marketId: `market-${slug}`,
    eventId: `event-${slug}`,
    tokenId: `token-${slug}`,
    slug,
    eventSlug: slug,
    title,
    outcomeLabel: title,
    venue: "Polymarket",
    probability: probabilityFromSlug(slug),
    updatedAt: new Date().toISOString()
  };
}

export function getMockMarketByTokenId(tokenId?: string): MarketSnapshot {
  const configuredMarket = mockMarkets.find((market) => market.tokenId === tokenId);
  if (configuredMarket) {
    return { ...configuredMarket, updatedAt: new Date().toISOString() };
  }

  return tokenId?.startsWith("token-")
    ? getMockMarketBySlug(tokenId.slice("token-".length))
    : getMockMarketBySlug(polymarketConfig.featuredMarketSlug);
}

export function getMockFeaturedMarket(slug = polymarketConfig.featuredMarketSlug): MarketSnapshot {
  return getMockMarketBySlug(slug);
}

export const featuredMarket = getMockFeaturedMarket();

export function createMarketSeries(market = getMockFeaturedMarket()): TimePoint[] {
  return Array.from({ length: 30 }, (_, index) => {
    const timestamp = subDays(now, 29 - index).toISOString();
    const drift = market.probability - 0.06 + index * (0.06 / 29);
    const oscillation = Math.sin(index / 3) * 0.018;
    return {
      timestamp,
      value: Number(Math.min(0.98, Math.max(0.02, drift + oscillation)).toFixed(3))
    };
  });
}

export const marketSeries = createMarketSeries();

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

export function createOrderbookSnapshot(market = getMockFeaturedMarket()): OrderbookState {
  const bestBid = Math.max(0.02, market.probability - 0.01);
  const bestAsk = Math.min(0.98, market.probability + 0.01);
  const bids = generateSide(bestBid, -1);
  const asks = generateSide(bestAsk, 1);
  const trades: TradePrint[] = Array.from({ length: 20 }, (_, index) => ({
    id: `trade-${index}`,
    side: index % 3 === 0 ? ("sell" as const) : ("buy" as const),
    price: Number((market.probability - 0.02 + Math.random() * 0.04).toFixed(2)),
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
    headline: "Swing-state polling tilts Republican",
    source: "Polling Consortium",
    category: "poll",
    impactScore: 78,
    marketMove: 3.4,
    summary: "Composite polling broke decisively toward the Republican ticket in decisive states, repricing the contract well above parity."
  },
  {
    id: "event-2",
    timestamp: subDays(now, 4).toISOString(),
    headline: "Democratic ticket reshuffles, GOP odds compress",
    source: "Campaign Desk",
    category: "campaign",
    impactScore: 72,
    marketMove: -3.2,
    summary: "An unexpected Democratic candidate change pulled the Republican lead back toward 50% as bettors priced in fresh momentum."
  },
  {
    id: "event-3",
    timestamp: subDays(now, 3).toISOString(),
    headline: "Soft economic prints test the rally",
    source: "Macro Calendar",
    category: "macro",
    impactScore: 58,
    marketMove: -1.6,
    summary: "Below-consensus data briefly weighed on the Republican contract before liquidity stabilized in the low 40s."
  },
  {
    id: "event-4",
    timestamp: subDays(now, 1).toISOString(),
    headline: "Closing-stretch buying flips the contract bullish",
    source: "Event Monitor",
    category: "debate",
    impactScore: 89,
    marketMove: 4.9,
    summary: "Late-cycle debate and rally signals lifted Republican positioning; best-bid depth doubled overnight as the contract reclaimed the 60s."
  }
];
