# Venue Data Flow

## Why Shared Caching Is Required

Polymarket's published limits are generous, but the global trade feed is limited
to 200 requests per 10 seconds. A five-second browser poll reaches that ceiling
at roughly 100 concurrently active clients if every request is forwarded.

Kalshi uses token buckets. Its Basic read budget is 200 tokens per second and
most reads cost 10 tokens, which is effectively 20 default-cost reads per
second. One selected market currently needs order book, trades, and candles, so
forwarding every browser refresh directly would consume that budget quickly.

The application must therefore distribute shared market snapshots rather than
operate as a transparent per-browser bridge.

## Data Paths

| Data | Upstream | Shared cache | Client refresh |
| --- | --- | --- | --- |
| European event registry | Polymarket Gamma | 5 minutes, 1 hour stale | 5 minutes |
| Event details | Polymarket Gamma | 5 minutes, 1 hour stale | On selection |
| Price history | Polymarket CLOB | 5 minutes, 1 hour stale | On selection |
| Order book snapshot | Polymarket CLOB | 2 seconds, 15 seconds stale | 30 seconds plus WebSocket |
| Recent trades | Polymarket Data API | 3 seconds, 15 seconds stale | 5 seconds |
| Kalshi event summaries | Kalshi REST | 15 seconds, 5 minutes stale | 15 seconds |
| Kalshi selected analytics | Kalshi REST | 10 seconds, 5 minutes stale | 30 seconds |
| Kalshi candles | Kalshi REST | 5 minutes | Included in selected analytics |

## Deployment Ownership

- Railway is the primary data plane for Polymarket and Kalshi event discovery,
  selected-market REST analytics, and shared Polymarket WebSocket subscriptions.
- Per-key single-flight locking means concurrent cache misses produce one
  upstream request inside a Railway process.
- Vercel API routes remain a deployment fallback, not the primary venue path.
- Browser queries use React Query only as a local presentation cache. It is not
  the protection layer for venue limits.
- CDN `stale-while-revalidate` and backend `stale-if-error` preserve the latest
  valid market snapshot during transient venue failures.

For multiple Railway replicas, move the in-process response cache to Redis
before horizontal scaling. CDN caching still protects public GET routes, but a
shared Redis cache is required to coalesce internal analytics and worker reads
across replicas.

## Published Limits

- Polymarket Gamma: 500 event requests per 10 seconds; event and market listing
  combined limit of 900 per 10 seconds.
- Polymarket Data API trades: 200 requests per 10 seconds.
- Polymarket CLOB order books: 1,500 requests per 10 seconds; price history:
  1,000 requests per 10 seconds.
- Kalshi Basic read budget: 200 tokens per second; most endpoints cost 10
  tokens. A 429 response does not include a retry header, so workers must apply
  exponential backoff.
