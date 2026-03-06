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
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- Current data is mocked but structured behind service adapters, so swapping to live REST / WebSocket endpoints is straightforward.
- The architecture is intentionally designed to showcase frontend systems thinking, not just UI styling.
- The same dashboard shell is exposed at `/`, `/market`, `/history`, and `/timeline` to match the proposed information architecture while keeping the initial implementation compact.
