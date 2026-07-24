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
  status: "open",
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
  probability: 1,
  volume24h: 0,
  openInterest: 6_450_000,
  liquidity: 0,
  endDate: "2026-05-26T00:00:00.000Z",
  status: "closed",
  outcomeLabel: "Will Ken Paxton win the 2026 Texas Republican Primary?",
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
  probability: 0.927,
  volume24h: 3_874.493822,
  openInterest: 1_120_000,
  liquidity: 67_314.01761,
  endDate: "2026-11-03T00:00:00.000Z",
  status: "open",
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
    status: "unknown",
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
    status: "unknown",
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
    status: "unknown",
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
    status: "unknown",
    outcomeLabel: "Leading outcome for most seats in the Northern Ireland Assembly election",
    updatedAt: now.toISOString()
  }
];

const europeMarkets: MarketSnapshot[] = [
  {
    marketId: "next-french-presidential-election",
    eventId: "event-next-french-presidential-election",
    tokenId:
      "55764212211467781322980371912612507865974994976253196346176314491480419639168",
    slug: "next-french-presidential-election",
    eventSlug: "next-french-presidential-election",
    title: "Next French Presidential Election",
    category: "Politics",
    probability: 0.3245,
    volume24h: 12_224.885544,
    openInterest: 0,
    liquidity: 297_243.58845,
    endDate: "2027-04-30T00:00:00.000Z",
    status: "open",
    outcomeLabel: "Will Marine Le Pen win the 2027 French presidential election?",
    updatedAt: now.toISOString()
  },
  {
    marketId: "berlin-state-election-winner",
    eventId: "event-berlin-state-election-winner",
    tokenId:
      "102682832966209969978965796495958715590593079468512867290824407541600306279619",
    slug: "berlin-state-election-winner",
    eventSlug: "berlin-state-election-winner",
    title: "Berlin State Election Winner",
    category: "Politics",
    probability: 0.33,
    volume24h: 1_346.749898,
    openInterest: 0,
    liquidity: 59_684.6989,
    endDate: "2026-09-20T00:00:00.000Z",
    status: "open",
    outcomeLabel: "Will Linke win the most seats in the 2026 Berlin state elections?",
    updatedAt: now.toISOString()
  },
  {
    marketId: "next-prime-minister-of-spain",
    eventId: "event-next-prime-minister-of-spain",
    tokenId:
      "30446115040994756735976163960167805883187697808359254957130669387440187908610",
    slug: "next-prime-minister-of-spain-20260625005215443",
    eventSlug: "next-prime-minister-of-spain-20260625005215443",
    title: "Next Prime Minister of Spain?",
    category: "Politics",
    probability: 0.805,
    volume24h: 758.37,
    openInterest: 0,
    liquidity: 18_173.3381,
    endDate: "2028-03-31T23:59:00.000Z",
    status: "open",
    outcomeLabel: "Will Alberto Nunez Feijoo be the next Prime Minister of Spain?",
    updatedAt: now.toISOString()
  },
  {
    marketId: "next-prime-minister-of-italy",
    eventId: "event-next-prime-minister-of-italy",
    tokenId:
      "92925956878413761296666205124299104254076986470847214501768371394347050368958",
    slug: "next-prime-minister-of-italy",
    eventSlug: "next-prime-minister-of-italy",
    title: "Next Prime Minister of Italy?",
    category: "Politics",
    probability: 0.525,
    volume24h: 62.5,
    openInterest: 0,
    liquidity: 6_862.5608,
    endDate: "2028-12-31T00:00:00.000Z",
    status: "open",
    outcomeLabel: "Will Giorgia Meloni be the next Prime Minister of Italy?",
    updatedAt: now.toISOString()
  },
  {
    marketId: "iceland-eu-membership-referendum",
    eventId: "event-iceland-eu-membership-referendum",
    tokenId:
      "115219528940805078601788795659304795391013024089082090049167812795798773409339",
    slug:
      "icelandic-european-union-membership-negotiations-referendum-passes-20260609135241589",
    eventSlug:
      "icelandic-european-union-membership-negotiations-referendum-passes-20260609135241589",
    title: "Icelandic European Union membership negotiations referendum passes?",
    category: "Politics",
    probability: 0.485,
    volume24h: 115.384614,
    openInterest: 0,
    liquidity: 6_153.2016,
    endDate: "2026-08-30T03:59:00.000Z",
    status: "open",
    outcomeLabel: "Icelandic European Union membership negotiations referendum passes?",
    updatedAt: now.toISOString()
  }
];

const mockMarkets = [
  defaultFeaturedMarket,
  texasRepublicanSenatePrimaryMarket,
  californiaGovernorElectionMarket,
  ...ukMarkets,
  ...europeMarkets
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
    status: "unknown",
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
