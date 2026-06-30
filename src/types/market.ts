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
  contractLabel?: string;
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

export type OrderbookSummary = {
  marketId: string;
  tokenId: string;
  updatedAt: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  bidLevels: number;
  askLevels: number;
  tradeCount: number;
  liquidity: {
    totalBidDepth: number;
    totalAskDepth: number;
    imbalance: number;
    spreadBps: number;
  };
  tradePressure: {
    buyVolume: number;
    sellVolume: number;
    ratio: number;
    pressure: "buy" | "sell" | "balanced";
  };
};

export type PriceHistoryMeta = {
  market: string;
  points: number;
  startTimestamp?: string | null;
  endTimestamp?: string | null;
};

export type MarketContext = {
  featuredMarket: MarketSnapshot;
  orderbookSummary: OrderbookSummary | null;
  priceHistoryMeta: PriceHistoryMeta;
  timelineEvents: TimelineEvent[];
};

export type LiveStreamStatus = {
  enabled: boolean;
  state: string;
  marketSlug: string;
  marketId?: string | null;
  tokenId?: string | null;
  connectedAt?: string | null;
  lastMessageAt?: string | null;
  lastEventType?: string | null;
  messageCount: number;
  reconnectCount: number;
  latencyMs?: number | null;
  error?: string | null;
};

export type LiveMicrostructureMetrics = {
  microprice: number;
  depthSkew: number;
  realizedVolatility: number;
  tradeIntensity: number;
  orderFlowImbalance: number;
};

export type LiveMetricSample = {
  timestamp: string;
  midPrice: number;
  spreadBps: number;
  microprice: number;
  depthSkew: number;
  realizedVolatility: number;
  tradeIntensity: number;
  orderFlowImbalance: number;
};

export type LiveMarketSnapshot = {
  status: LiveStreamStatus;
  orderbookSummary: OrderbookSummary | null;
  microstructure?: LiveMicrostructureMetrics | null;
};

export type LiveReplay = {
  status: LiveStreamStatus;
  samples: LiveMetricSample[];
  sampleCount: number;
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
