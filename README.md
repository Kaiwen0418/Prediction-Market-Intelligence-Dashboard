# Prediction Market Intelligence Dashboard

A frontend-only, production-style analytics dashboard for prediction markets. The project demonstrates realtime data handling, client-side state architecture, derived market analytics, and rich visualization without a custom backend.

## Problem

Prediction markets react faster than many traditional information channels, but raw market pages do not explain:

- how market pricing compares with polls
- whether price action leads or lags public polling
- what events likely caused moves
- what the orderbook says about short-term conviction

## Solution

This dashboard treats the frontend as a complete intelligence layer:

- ingest market, polling, and event data
- maintain query cache and live store state
- compute derived analytics in the client
- render dashboard views for interpretation

## Core Features

- Historical `market probability vs poll average` chart
- `Lead-lag analysis` using cross-correlation
- `Realtime orderbook` depth, spread, and recent trade prints
- `Event timeline` connecting catalysts to market moves
- `Analytics layer` for volatility, momentum, and liquidity imbalance

## Architecture

```text
External APIs
 ├ Polymarket
 ├ Polling data
 └ News / event feeds
       │
       ▼
Frontend ingestion layer
 ├ TanStack Query cache
 ├ Mock/live-ready WebSocket manager
 └ Service adapters
       │
       ▼
Client stores
 ├ marketStore
 ├ orderbookStore
 └ eventStore
       │
       ▼
Analytics layer
 ├ leadLag.ts
 ├ volatility.ts
 ├ momentum.ts
 └ liquidity.ts
       │
       ▼
Visualization layer
 ├ time-series chart
 ├ depth chart
 ├ orderbook table
 ├ trade tape
 └ event timeline
       │
       ▼
Dashboard UI
```

## Stack

- Next.js App Router
- TypeScript
- Zustand
- TanStack Query
- ECharts
- Tailwind CSS
- date-fns
- d3-array / d3-scale ready in dependency layer for future expansion

## Repo Structure

```text
src
 ├ app
 │   ├ page.tsx
 │   ├ market/page.tsx
 │   ├ history/page.tsx
 │   └ timeline/page.tsx
 ├ analytics
 ├ components
 │   ├ charts
 │   ├ dashboard
 │   ├ layout
 │   ├ orderbook
 │   └ timeline
 ├ hooks
 ├ services
 │   ├ polymarket
 │   ├ polling
 │   └ news
 ├ stores
 ├ websocket
 ├ utils
 └ types
```

## Local Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create a local `.env.local` from `.env.example` if you want to point the app at a specific live market slug or override API endpoints.

## Notes

- The app now uses live-ready Polymarket REST / WebSocket adapters with mock fallback, so the dashboard remains usable if upstream fetches fail.
- The architecture is intentionally designed to showcase frontend systems thinking, not just UI styling.
- Routes now have distinct purposes:
  - `/` overview
  - `/market` realtime microstructure
  - `/history` lead-lag and historical comparison
  - `/timeline` catalyst interpretation
