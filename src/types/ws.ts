import type { OrderbookLevel } from "@/types/market";

export type MarketChannelSubscription = {
  type: "market";
  assets_ids: string[];
  custom_feature_enabled?: boolean;
  initial_dump?: boolean;
  operation?: "subscribe" | "unsubscribe";
};

export type MarketBookEvent = {
  event_type: "book";
  asset_id?: string;
  market?: string;
  bids?: Array<{ price: string; size: string }>;
  asks?: Array<{ price: string; size: string }>;
  timestamp?: string;
  hash?: string;
};

export type MarketPriceChangeEvent = {
  event_type: "price_change";
  asset_id?: string;
  market?: string;
  price_changes?: Array<{
    price: string;
    size: string;
    side: "BUY" | "SELL" | "buy" | "sell";
    best_bid?: string;
    best_ask?: string;
  }>;
  timestamp?: string;
};

export type MarketTradeEvent = {
  event_type: "last_trade_price";
  asset_id?: string;
  market?: string;
  price?: string;
  side?: "BUY" | "SELL" | "buy" | "sell";
  size?: string;
  timestamp?: string;
};

export type MarketBestBidAskEvent = {
  event_type: "best_bid_ask";
  asset_id?: string;
  market?: string;
  best_bid?: string;
  best_ask?: string;
  spread?: string;
  timestamp?: string;
};

export type MarketTickSizeEvent = {
  event_type: "tick_size_change";
  asset_id?: string;
  market?: string;
  old_tick_size?: string;
  new_tick_size?: string;
  timestamp?: string;
};

export type MarketStreamEvent =
  | MarketBookEvent
  | MarketPriceChangeEvent
  | MarketTradeEvent
  | MarketBestBidAskEvent
  | MarketTickSizeEvent;

export type NormalizedBookEvent = {
  tokenId: string;
  marketId?: string;
  bids?: OrderbookLevel[];
  asks?: OrderbookLevel[];
  bestBid?: number;
  bestAsk?: number;
  tickSize?: number;
  trade?: {
    price: number;
    size: number;
    side: "buy" | "sell";
  };
  receivedAt: string;
};
