import type { MarketStatus, VenueMarketSummary } from "@/types/market";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asTimestamp(value: unknown) {
  const timestamp = new Date(asString(value));
  return Number.isFinite(timestamp.getTime())
    ? timestamp.toISOString()
    : undefined;
}

function asHttpUrl(value: unknown) {
  const rawUrl = asString(value);
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function normalizeStatus(markets: UnknownRecord[]): MarketStatus {
  const statuses = new Set(markets.map((market) => asString(market.status)));
  if (statuses.has("active")) return "open";
  if (statuses.has("inactive") || statuses.has("paused")) return "inactive";
  if (statuses.has("closed") || statuses.has("finalized")) return "closed";
  return "unknown";
}

function getKalshiUrl(seriesTicker: string, eventTicker: string) {
  return `https://kalshi.com/markets/${seriesTicker.toLowerCase()}/${eventTicker.toLowerCase()}`;
}

export function normalizeKalshiEvents(payload: unknown): VenueMarketSummary[] {
  if (!isRecord(payload) || !Array.isArray(payload.events)) return [];

  return payload.events.flatMap((eventValue) => {
    if (!isRecord(eventValue) || !Array.isArray(eventValue.markets)) return [];

    const eventTicker = asString(eventValue.event_ticker);
    const seriesTicker = asString(eventValue.series_ticker);
    const markets = eventValue.markets.filter(isRecord);
    if (!eventTicker || !seriesTicker || !markets.length) return [];

    const tradableMarkets = markets.filter(
      (market) => asString(market.status) === "active"
    );
    const rankedMarkets = (tradableMarkets.length ? tradableMarkets : markets)
      .slice()
      .sort(
        (left, right) =>
          asNumber(right.last_price_dollars) -
          asNumber(left.last_price_dollars)
      );
    const leader = rankedMarkets[0];
    const settlementSource = Array.isArray(eventValue.settlement_sources)
      ? eventValue.settlement_sources.find(isRecord)
      : undefined;

    return [
      {
        venue: "Kalshi" as const,
        eventTicker,
        seriesTicker,
        title: asString(eventValue.title, asString(leader.title, eventTicker)),
        outcomeLabel:
          asString(leader.yes_sub_title) ||
          asString(leader.subtitle) ||
          undefined,
        probability: asNumber(leader.last_price_dollars),
        volume24h: markets.reduce(
          (sum, market) => sum + asNumber(market.volume_24h_fp),
          0
        ),
        liquidity: markets.reduce(
          (sum, market) => sum + asNumber(market.liquidity_dollars),
          0
        ),
        status: normalizeStatus(markets),
        endDate:
          asTimestamp(leader.expected_expiration_time) ??
          asTimestamp(leader.close_time),
        resolutionSource: settlementSource
          ? asHttpUrl(settlementSource.url)
          : undefined,
        url: getKalshiUrl(seriesTicker, eventTicker),
        updatedAt: new Date().toISOString()
      }
    ];
  });
}
