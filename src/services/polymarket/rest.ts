import type { MarketSnapshot, OrderbookState, TimePoint, TradePrint } from "@/types/market";
import { useDataSourceStore } from "@/stores/dataSourceStore";
import { polymarketConfig } from "./config";
import { normalizeGammaEvent, normalizeGammaMarket, normalizeOrderbook, normalizePriceHistory } from "./normalizers";
import {
  validateGammaEventPayload,
  validateGammaMarketPayload,
  validateOrderbookPayload,
  validatePriceHistoryPayload,
  validateSlug,
  validateTradesPayload
} from "./preflight";

function recordLive(sourceKey: string) {
  useDataSourceStore.getState().markLive(sourceKey);
}

function recordFallback(sourceKey: string, stage: "config" | "reachability" | "payload" | "normalization", message: string) {
  useDataSourceStore.getState().markFallback(sourceKey, { stage, message });
}

async function requestJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), polymarketConfig.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal,
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      throw new Error(`Polymarket request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function pickFeaturedMarket(markets: unknown[]): MarketSnapshot | null {
  for (const market of markets) {
    const normalized = normalizeGammaMarket(market);
    if (normalized?.tokenId) return normalized;
  }
  return null;
}

export async function fetchEventMarketBySlug(
  slug: string,
  preferredOutcomeLabels: string[] = []
): Promise<MarketSnapshot | null> {
  const slugIssue = validateSlug(slug);
  if (slugIssue) {
    return null;
  }

  const url = `/api/polymarket/featured-market?slug=${encodeURIComponent(slug)}`;
  const payload = await requestJson<unknown>(url);
  const payloadIssue = validateGammaEventPayload(payload);
  if (payloadIssue) {
    return null;
  }

  return normalizeGammaEvent(payload, preferredOutcomeLabels);
}

export async function fetchFeaturedMarketLive(): Promise<MarketSnapshot | null> {
  const slugIssue = validateSlug(polymarketConfig.featuredMarketSlug);
  if (slugIssue) {
    recordFallback("featured-market", slugIssue.stage, slugIssue.message);
    return null;
  }

  const bySlugUrl = `/api/polymarket/featured-market?slug=${encodeURIComponent(polymarketConfig.featuredMarketSlug)}`;

  try {
    const payload = await requestJson<unknown>(bySlugUrl);
    const payloadIssue = validateGammaEventPayload(payload);
    if (payloadIssue) {
      recordFallback("featured-market", payloadIssue.stage, payloadIssue.message);
    } else {
      const normalized = normalizeGammaEvent(payload);
      if (normalized?.tokenId) {
        recordLive("featured-market");
        return normalized;
      }
      recordFallback("featured-market", "normalization", "Gamma market payload could not be normalized");
    }
  } catch {
    recordFallback("featured-market", "reachability", "Featured market slug request failed");
  }

  const marketsUrl = `/api/polymarket/featured-market`;
  try {
    const payload = await requestJson<unknown>(marketsUrl);
    const events = Array.isArray(payload)
      ? payload
      : typeof payload === "object" && payload !== null && Array.isArray((payload as Record<string, unknown>).data)
        ? ((payload as Record<string, unknown>).data as unknown[])
        : [];

    const picked = events
      .map((event) => normalizeGammaEvent(event))
      .filter((event): event is MarketSnapshot => event !== null)
      .find((event) => event.slug === polymarketConfig.featuredMarketSlug) ?? pickFeaturedMarket(events);

    if (picked) {
      recordLive("featured-market");
      return picked;
    }
    recordFallback("featured-market", "normalization", "Active markets list did not yield a usable market");
    return null;
  } catch {
    recordFallback("featured-market", "reachability", "Active markets fallback request failed");
    return null;
  }
}

export async function fetchPriceHistoryLive(tokenId: string): Promise<TimePoint[]> {
  const historyUrl = `/api/polymarket/price-history?tokenId=${encodeURIComponent(tokenId)}`;
  try {
    const payload = await requestJson<unknown>(historyUrl);
    const payloadIssue = validatePriceHistoryPayload(payload);
    if (payloadIssue) {
      recordFallback("price-history", payloadIssue.stage, payloadIssue.message);
      return [];
    }
    const history = normalizePriceHistory(payload);
    if (history.length > 1) {
      recordLive("price-history");
      return history;
    }
    recordFallback("price-history", "normalization", "Price history normalization produced insufficient points");
    return [];
  } catch {
    recordFallback("price-history", "reachability", "Price history request failed");
    return [];
  }
}

export async function fetchOrderbookLive(tokenId: string): Promise<OrderbookState | null> {
  const orderbookUrl = `/api/polymarket/orderbook?tokenId=${encodeURIComponent(tokenId)}`;
  try {
    const payload = await requestJson<unknown>(orderbookUrl);
    const payloadIssue = validateOrderbookPayload(payload);
    if (payloadIssue) {
      recordFallback("orderbook", payloadIssue.stage, payloadIssue.message);
      return null;
    }
    const orderbook = normalizeOrderbook(payload, tokenId);
    if (orderbook) {
      recordLive("orderbook");
      return orderbook;
    }
    recordFallback("orderbook", "normalization", "Orderbook payload could not be normalized");
    return null;
  } catch {
    recordFallback("orderbook", "reachability", "Orderbook request failed");
    return null;
  }
}

export async function fetchTradesLive(tokenId: string): Promise<TradePrint[]> {
  const tradesUrl = `/api/polymarket/trades?tokenId=${encodeURIComponent(tokenId)}`;
  try {
    const payload = await requestJson<unknown>(tradesUrl);
    const payloadIssue = validateTradesPayload(payload);
    if (payloadIssue) {
      recordFallback("trades", payloadIssue.stage, payloadIssue.message);
      return [];
    }
    const normalized = normalizeOrderbook({ trades: Array.isArray(payload) ? payload : [] }, tokenId);
    const trades = normalized?.trades ?? [];
    if (trades.length) {
      recordLive("trades");
      return trades;
    }
    recordFallback("trades", "normalization", "Trades normalization produced no rows");
    return [];
  } catch {
    recordFallback("trades", "reachability", "Trades request failed");
    return [];
  }
}
