export const polymarketConfig = {
  gammaBaseUrl: process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_BASE_URL ?? "https://gamma-api.polymarket.com",
  clobBaseUrl: process.env.NEXT_PUBLIC_POLYMARKET_CLOB_BASE_URL ?? "https://clob.polymarket.com",
  wsUrl: process.env.NEXT_PUBLIC_POLYMARKET_WS_URL ?? "wss://ws-subscriptions-clob.polymarket.com/ws/market",
  featuredMarketSlug: process.env.NEXT_PUBLIC_POLYMARKET_MARKET_SLUG ?? "texas-republican-senate-primary-winner",
  requestTimeoutMs: 8_000
} as const;
