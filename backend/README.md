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
- `POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws/market`
- `LIVE_STREAM_ENABLED=true`
- `LIVE_STREAM_INITIAL_DUMP=true`
- `LIVE_STREAM_MAX_MARKETS=6`
- `LIVE_STREAM_IDLE_TTL_SECONDS=300`
- `LIVE_STREAM_CLEANUP_INTERVAL_SECONDS=60`
- `LIVE_STREAM_METRICS_HISTORY_LIMIT=240`
- `ALLOW_ORIGINS=["https://your-vercel-app.vercel.app"]`

## Current endpoints

- `GET /health`
- `GET /api/polymarket/featured-market`
- `GET /api/polymarket/orderbook`
- `GET /api/polymarket/price-history`
- `GET /api/polymarket/trades`
- `GET /api/polymarket/market-context`
- `GET /api/live/status`
- `GET /api/live/market-snapshot`
- `GET /api/live/replay`
- `GET /api/live/stream`

The live-stream registry is bounded and self-cleaning:

- the featured slug is kept warm
- additional slug streams are evicted when the registry exceeds `LIVE_STREAM_MAX_MARKETS`
- idle non-featured streams are removed after `LIVE_STREAM_IDLE_TTL_SECONDS`
- `GET /api/research/states/{state}/summary`
- `POST /api/analytics/lead-lag`
- `POST /api/analytics/correlation`
- `POST /api/analytics/volatility`
- `POST /api/analytics/summary`
- `POST /api/analytics/event-window`

## Tests

```bash
PYTHONPATH=backend python -m unittest discover -s tests
```
