import type { NormalizedBookEvent, MarketStreamEvent } from "@/types/ws";

function asNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSide(side: string | undefined): "buy" | "sell" {
  return String(side).toLowerCase() === "sell" ? "sell" : "buy";
}

function normalizeEvent(event: MarketStreamEvent): NormalizedBookEvent | null {
  const tokenId = event.asset_id ?? "";
  if (!tokenId) return null;

  if (event.event_type === "book") {
    return {
      tokenId,
      marketId: event.market,
      bids: (event.bids ?? []).map((level) => ({
        price: asNumber(level.price),
        size: asNumber(level.size)
      })),
      asks: (event.asks ?? []).map((level) => ({
        price: asNumber(level.price),
        size: asNumber(level.size)
      })),
      receivedAt: event.timestamp ?? new Date().toISOString()
    };
  }

  if (event.event_type === "price_change") {
    const change = event.price_changes?.[0];
    if (!change) return null;
    return {
      tokenId,
      marketId: event.market,
      bestBid: asNumber(change.best_bid),
      bestAsk: asNumber(change.best_ask),
      receivedAt: event.timestamp ?? new Date().toISOString()
    };
  }

  if (event.event_type === "last_trade_price") {
    return {
      tokenId,
      marketId: event.market,
      trade: event.price && event.size
        ? {
            price: asNumber(event.price),
            size: asNumber(event.size),
            side: normalizeSide(event.side)
          }
        : undefined,
      receivedAt: event.timestamp ?? new Date().toISOString()
    };
  }

  if (event.event_type === "best_bid_ask") {
    return {
      tokenId,
      marketId: event.market,
      bestBid: asNumber(event.best_bid),
      bestAsk: asNumber(event.best_ask),
      receivedAt: event.timestamp ?? new Date().toISOString()
    };
  }

  if (event.event_type === "tick_size_change") {
    return {
      tokenId,
      marketId: event.market,
      tickSize: asNumber(event.new_tick_size),
      receivedAt: event.timestamp ?? new Date().toISOString()
    };
  }

  return null;
}

export function routeMarketStreamMessage(payload: unknown): NormalizedBookEvent[] {
  const events = Array.isArray(payload) ? payload : [payload];
  return events
    .filter((event): event is MarketStreamEvent => typeof event === "object" && event !== null && "event_type" in event)
    .map(normalizeEvent)
    .filter((event): event is NormalizedBookEvent => event !== null);
}
