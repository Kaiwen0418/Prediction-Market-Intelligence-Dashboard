export type TimePoint = {
  timestamp: string;
  value: number;
};

export type MarketSnapshot = {
  marketId: string;
  slug: string;
  title: string;
  category: string;
  probability: number;
  volume24h: number;
  openInterest: number;
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
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  trades: TradePrint[];
  spread: number;
  midPrice: number;
  updatedAt: string;
};

export type TimelineEvent = {
  id: string;
  timestamp: string;
  headline: string;
  source: string;
  impactScore: number;
  marketMove: number;
  summary: string;
};
