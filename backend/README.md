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
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Python version: `3.11+`

Environment variables:

- `APP_ENV=production`
- `FEATURED_MARKET_SLUG=california-governor-election-2026`
- `ALLOW_ORIGINS=["https://your-vercel-app.vercel.app"]`

## Current endpoints

- `GET /health`
- `GET /api/polymarket/featured-market`
- `GET /api/polymarket/orderbook`
- `GET /api/polymarket/price-history`
- `GET /api/polymarket/trades`
- `POST /api/analytics/lead-lag`
- `POST /api/analytics/correlation`
- `POST /api/analytics/volatility`
