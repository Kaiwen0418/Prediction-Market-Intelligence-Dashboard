# Prediction Market Intelligence Dashboard

Production-style frontend for prediction market analysis. The app combines live Polymarket data, cached research datasets, client-side analytics, and editorial visualization in a single Next.js project.

## Product Structure

- `/` Home: hero + embedded live market surface
- `/history` Research: cached polling vs market comparison
- `/market` Redirects to `/`

## Core Capabilities

- Live featured market and orderbook view
- Interactive U.S. state map with market rail
- Annotated Polymarket price-history chart
- Research-grade polling vs market comparison page
- Client-side analytics for lead-lag, correlation, volatility, and liquidity

## Stack

- Next.js App Router
- TypeScript
- Zustand
- TanStack Query
- ECharts
- Tailwind CSS
- Three.js
- react-simple-maps

## Local Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel Deployment

This repo is now Vercel-first.

### Recommended settings

- Framework preset: `Next.js`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: leave empty
- Node version: `22.x`

### Environment variables

None are required for the default Vercel deployment.

Do not set any static-export flags. The app is intended to run as a normal Next.js deployment with serverless route handlers on Vercel.

## Public Data Assets

- Polling dataset: [public/data/state-party-support-2024.json](/Users/blueberryncherry/Proj/Prediction%20Market%20Intelligence%20Dashboard/public/data/state-party-support-2024.json)
- Cached Polymarket history: [public/data/polymarket-history-2024.json](/Users/blueberryncherry/Proj/Prediction%20Market%20Dashboard/public/data/polymarket-history-2024.json)

## Validation

```bash
pnpm typecheck
pnpm build
```

Or provide a local CSV path:

```bash
pnpm generate:state-support -- /tmp/presidential_general_averages_2024-09-12_uncorrected.csv
```

## Notes

- The app now uses live-ready Polymarket REST / WebSocket adapters with mock fallback, so the dashboard remains usable if upstream fetches fail.
- The architecture is intentionally designed to showcase frontend systems thinking, not just UI styling.
- Routes now have distinct purposes:
  - `/` overview
  - `/market` realtime microstructure
  - `/history` lead-lag and historical comparison
  - `/timeline` catalyst interpretation

