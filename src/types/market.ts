export type TimePoint = {
  timestamp: string;
  value: number;
};

export type MarketSnapshot = {
  marketId: string;
  eventId?: string;
  tokenId?: string;
  slug: string;
  eventSlug?: string;
  title: string;
  category: string;
  probability: number;
  volume24h: number;
  openInterest: number;
  liquidity?: number;
  image?: string;
  description?: string;
  outcomeLabel?: string;
  updatedAt: string;
};

export type OrderbookLevel = {
  price: number;
  size: number;
};

export type TradePrint = {
  id: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  timestamp: string;
};

export type OrderbookState = {
  marketId: string;
  tokenId?: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  trades: TradePrint[];
  spread: number;
  midPrice: number;
  tickSize?: number;
  source: "mock" | "live";
  updatedAt: string;
};

export type TimelineEvent = {
  id: string;
  eventId?: string;
  timestamp: string;
  headline: string;
  source: string;
  category?: string;
  impactScore: number;
  marketMove: number;
  summary: string;
};
