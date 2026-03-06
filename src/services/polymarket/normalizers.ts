import type { MarketSnapshot, OrderbookLevel, OrderbookState, TimelineEvent, TimePoint, TradePrint } from "@/types/market";
import type { NormalizedBookEvent } from "@/types/ws";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function parseTokenMetadata(payload: UnknownRecord) {
  const tokenIds = parseJsonArray(payload.clobTokenIds);
  const outcomes = parseJsonArray(payload.outcomes);
  const outcomePrices = parseJsonArray(payload.outcomePrices);
  const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];

  const tokenRecord = tokens.find(isRecord);

  return {
    tokenId:
      firstString([tokenIds[0], payload.clobTokenId, tokenRecord?.token_id, tokenRecord?.asset_id, payload.conditionId]) ??
      undefined,
    outcomeLabel: firstString([outcomes[0], tokenRecord?.outcome, "Yes"]),
    probability: asNumber(outcomePrices[0], asNumber(tokenRecord?.price, asNumber(payload.lastTradePrice, 0.5)))
  };
}

function normalizeEventMarketCandidate(event: UnknownRecord, market: UnknownRecord): MarketSnapshot | null {
  const { tokenId, outcomeLabel, probability } = parseTokenMetadata(market);
  if (!tokenId) return null;

  const marketId = asString(market.id, asString(market.conditionId, tokenId));
  const contractLabel = asString(market.question, asString(market.title, ""));
  const normalizedOutcomeLabel =
    outcomeLabel && ["yes", "no"].includes(outcomeLabel.toLowerCase()) && contractLabel ? contractLabel : outcomeLabel;

  return {
    marketId,
    eventId: asString(event.id) || undefined,
    tokenId,
    slug: asString(event.slug, marketId),
    eventSlug: asString(event.slug, marketId),
    title: asString(event.title, asString(event.slug, marketId)),
    category: asString(event.category, asString(market.category, "Politics")),
    probability,
    volume24h: asNumber(market.volume24hr, asNumber(event.volume24hr)),
    openInterest: asNumber(market.openInterest, asNumber(event.openInterest)),
    liquidity: asNumber(market.liquidity, asNumber(event.liquidity)),
    image: asString(event.image) || undefined,
    description: asString(event.description) || undefined,
    outcomeLabel: normalizedOutcomeLabel ?? contractLabel,
    contractLabel,
    updatedAt: new Date().toISOString()
  };
}

export function normalizeGammaMarket(payload: unknown): MarketSnapshot | null {
  if (!isRecord(payload)) return null;

  const { tokenId, outcomeLabel, probability } = parseTokenMetadata(payload);
  const marketId = asString(payload.id, asString(payload.conditionId, asString(payload.slug, "unknown-market")));
  const slug = asString(payload.slug, marketId);
  const title = asString(payload.question, asString(payload.title, slug));

  return {
    marketId,
    eventId: asString(payload.eventId) || undefined,
    tokenId,
    slug,
    eventSlug: asString(payload.eventSlug, slug),
    title,
    category: asString(payload.category, "Politics"),
    probability,
    volume24h: asNumber(payload.volume24hr, asNumber(payload.volume24h)),
    openInterest: asNumber(payload.openInterest),
    liquidity: asNumber(payload.liquidity),
    image: asString(payload.image) || undefined,
    description: asString(payload.description) || undefined,
    outcomeLabel,
    updatedAt: new Date().toISOString()
  };
}

export function normalizeGammaEvent(payload: unknown, preferredOutcomeLabels: string[] = []): MarketSnapshot | null {
  if (!isRecord(payload) || !Array.isArray(payload.markets)) return null;

  const candidates = payload.markets
    .filter(isRecord)
    .map((market) => normalizeEventMarketCandidate(payload, market))
    .filter((market): market is MarketSnapshot => market !== null);

  if (!candidates.length) return null;

  if (preferredOutcomeLabels.length) {
    const preferred = candidates.find((candidate) =>
      preferredOutcomeLabels.some(
        (label) =>
          candidate.outcomeLabel?.toLowerCase().includes(label.toLowerCase()) ||
          candidate.contractLabel?.toLowerCase().includes(label.toLowerCase()) ||
          candidate.title.toLowerCase().includes(label.toLowerCase())
      )
    );

    if (preferred) return preferred;
  }

  return candidates.sort((left, right) => right.probability - left.probability)[0];
}

export function normalizePriceHistory(payload: unknown): TimePoint[] {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.history)
      ? payload.history
      : isRecord(payload) && Array.isArray(payload.data)
        ? payload.data
        : [];

  return rows
    .filter(isRecord)
    .map((row) => {
      const timestampValue = row.t ?? row.timestamp;
      const priceValue = row.p ?? row.price;
      const timestamp =
        typeof timestampValue === "number"
          ? new Date(timestampValue * 1000).toISOString()
          : asString(timestampValue, new Date().toISOString());

      return {
        timestamp,
        value: asNumber(priceValue)
      };
    })
    .filter((point) => point.value > 0);
}

function normalizeLevels(input: unknown): OrderbookLevel[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(isRecord)
    .map((row) => ({
      price: asNumber(row.price),
      size: asNumber(row.size)
    }))
    .filter((row) => row.price > 0 && row.size > 0);
}

function normalizeTrades(input: unknown): TradePrint[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(isRecord)
    .map((trade, index): TradePrint => {
      const side: TradePrint["side"] = String(trade.side).toLowerCase() === "sell" ? "sell" : "buy";
      return {
        id: asString(trade.id, `${asString(trade.transactionHash, "trade")}-${index}`),
        side,
        price: asNumber(trade.price),
        size: asNumber(trade.size),
        timestamp:
          typeof trade.timestamp === "number"
            ? new Date(trade.timestamp * 1000).toISOString()
            : asString(trade.timestamp, new Date().toISOString())
      };
    })
    .filter((trade) => trade.price > 0 && trade.size > 0);
}

export function normalizeOrderbook(payload: unknown, tokenId?: string): OrderbookState | null {
  if (!isRecord(payload)) return null;

  const bids = normalizeLevels(payload.bids);
  const asks = normalizeLevels(payload.asks);
  const trades = normalizeTrades(payload.trades);
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : 0;

  return {
    marketId: asString(payload.market, tokenId ?? "live-market"),
    tokenId,
    bids,
    asks,
    trades,
    spread: Number(spread.toFixed(4)),
    midPrice: Number(midPrice.toFixed(4)),
    tickSize: asNumber(payload.tick_size ?? payload.tickSize, 0.01),
    source: "live",
    updatedAt: new Date().toISOString()
  };
}

export function mergeNormalizedBookEvent(previous: OrderbookState | null, event: NormalizedBookEvent): OrderbookState | null {
  const bids = event.bids ?? previous?.bids ?? [];
  const asks = event.asks ?? previous?.asks ?? [];
  const trades = event.trade
    ? [
        {
          id: `${event.tokenId}-${event.receivedAt}`,
          side: event.trade.side,
          price: event.trade.price,
          size: event.trade.size,
          timestamp: event.receivedAt
        },
        ...(previous?.trades ?? [])
      ].slice(0, 50)
    : (previous?.trades ?? []);

  const bestBid = event.bestBid ?? bids[0]?.price ?? previous?.bids[0]?.price ?? 0;
  const bestAsk = event.bestAsk ?? asks[0]?.price ?? previous?.asks[0]?.price ?? 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : 0;

  return {
    marketId: event.marketId ?? previous?.marketId ?? event.tokenId,
    tokenId: event.tokenId,
    bids,
    asks,
    trades,
    spread: Number(spread.toFixed(4)),
    midPrice: Number(midPrice.toFixed(4)),
    tickSize: event.tickSize ?? previous?.tickSize ?? 0.01,
    source: "live",
    updatedAt: event.receivedAt
  };
}

export function normalizeTimelineFromMarket(market: MarketSnapshot): TimelineEvent[] {
  return [
    {
      id: `${market.marketId}-launch`,
      eventId: market.eventId,
      timestamp: market.updatedAt,
      headline: `${market.title} remains the active reference market`,
      source: "Polymarket",
      category: "market",
      impactScore: Math.round(market.probability * 100),
      marketMove: 0,
      summary: "Live event feed is not configured yet, so the timeline falls back to market metadata and analytics context."
    }
  ];
}
