# Prediction Market API

FastAPI + NumPy backend for the Vercel-hosted frontend.

## Local development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

Open `http://localhost:8000/docs`.

## Railway deployment

Recommended Railway service setup:

- Root directory: `backend`
- Builder: `Nixpacks`
- Start command: leave empty if `backend/nixpacks.toml` is used, otherwise use `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Python version: `3.11+`

If Railway was previously started with a manual `uvicorn ...` command and no install phase, you'll see `/bin/bash: uvicorn: command not found`. This repo now includes:

- [requirements.txt](/Users/blueberryncherry/Proj/Prediction%20Market%20Intelligence%20Dashboard/backend/requirements.txt)
- [nixpacks.toml](/Users/blueberryncherry/Proj/Prediction%20Market%20Intelligence%20Dashboard/backend/nixpacks.toml)

These force Railway to install the backend dependencies before boot.

Environment variables:

- `APP_ENV=production`
- `FEATURED_MARKET_SLUG=california-governor-election-2026`
- `DATA_API_BASE_URL=https://data-api.polymarket.com`
- `POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws/market`
- `POLYMARKET_MARKET_CACHE_TTL_SECONDS=300`
- `POLYMARKET_ORDERBOOK_CACHE_TTL_SECONDS=2`
- `POLYMARKET_TRADES_CACHE_TTL_SECONDS=3`
- `POLYMARKET_HISTORY_CACHE_TTL_SECONDS=300`
- `POLYMARKET_REALTIME_STALE_IF_ERROR_SECONDS=15`
- `POLYMARKET_MARKET_STALE_IF_ERROR_SECONDS=3600`
- `KALSHI_BASE_URL=https://external-api.kalshi.com/trade-api/v2`
- `KALSHI_EVENT_CACHE_TTL_SECONDS=15`
- `KALSHI_ANALYTICS_CACHE_TTL_SECONDS=10`
- `KALSHI_HISTORY_CACHE_TTL_SECONDS=300`
- `KALSHI_STALE_IF_ERROR_SECONDS=300`
- `LIVE_STREAM_ENABLED=true`
- `LIVE_STREAM_INITIAL_DUMP=true`
- `LIVE_STREAM_MAX_MARKETS=6`
- `LIVE_STREAM_IDLE_TTL_SECONDS=300`
- `LIVE_STREAM_CLEANUP_INTERVAL_SECONDS=60`
- `LIVE_STREAM_METRICS_HISTORY_LIMIT=240`
- `ALLOW_ORIGINS=["https://your-vercel-app.vercel.app"]`

## Current endpoints

- `GET /health`
- `GET /api/polymarket/events`
- `GET /api/polymarket/featured-market`
- `GET /api/polymarket/orderbook`
- `GET /api/polymarket/price-history`
- `GET /api/polymarket/trades`
- `GET /api/polymarket/market-context`
- `GET /api/kalshi/events`
- `GET /api/kalshi/analytics`
- `GET /api/live/status`
- `GET /api/live/market-snapshot`
- `GET /api/live/replay`
- `GET /api/live/stream`

The live-stream registry is bounded and self-cleaning:

- the featured slug is kept warm
- additional slug streams are evicted when the registry exceeds `LIVE_STREAM_MAX_MARKETS`
- idle non-featured streams are removed after `LIVE_STREAM_IDLE_TTL_SECONDS`

REST venue reads use a shared in-process cache with per-key single-flight
coalescing. Concurrent browser requests for the same expired key produce one
upstream request. Use one Railway replica with this cache; move it to Redis
before adding replicas.

Live status metadata now includes:

- `sampleCount`
- `lastSampledAt`
- `lastErrorAt`
- `lastDisconnectReason`

The stream manager also emits structured JSON log lines for registration, connection, progress, eviction, cleanup, and reconnect errors.
- `GET /api/research/states/{state}/summary`
- `GET /api/research/states/overview`
- `POST /api/analytics/lead-lag`
- `POST /api/analytics/correlation`
- `POST /api/analytics/volatility`
- `POST /api/analytics/summary`
- `POST /api/analytics/event-window`

## Tests

```bash
PYTHONPATH=backend python -m unittest discover -s tests
```
