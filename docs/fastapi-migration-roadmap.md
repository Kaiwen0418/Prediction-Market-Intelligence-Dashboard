# FastAPI Migration Roadmap

This project is moving from a frontend-first dashboard toward a split architecture:

- `Next.js` on Vercel for product UI
- `FastAPI + NumPy` on Railway for ingestion and analytics

## Current State

- Live Polymarket proxy routes exist in the FastAPI backend
- Frontend can target the external API through `NEXT_PUBLIC_API_BASE_URL`
- `/history` analytics now prefer the backend summary endpoint and fall back to local TypeScript if the backend is unavailable

## Next Milestones

### 1. History Analytics Full Migration

- Move all research analytics to backend-owned contracts
- Add derived metrics:
  - divergence score
  - rolling correlation
  - event-window return analysis
- Remove direct frontend imports of analytics math once coverage is complete

### 2. Data Ingestion Layer

- Add scheduled polling dataset refresh jobs
- Add Polymarket history refresh and normalization jobs
- Persist normalized snapshots instead of recalculating from public JSON on every request

### 3. Research API

- Introduce backend routes such as:
  - `GET /api/research/states/{state}/summary`
  - `GET /api/research/states/{state}/poll-vs-market`
  - `GET /api/research/states/{state}/divergence`
- Return explicit metadata about data freshness and analysis provenance

### 4. Storage

- Add SQLite or Postgres for:
  - cached market history
  - normalized polling series
  - scheduled analysis outputs
- Keep the frontend stateless and read-only against these API outputs

### 5. Testing and Reliability

- Add Python tests for NumPy analytics
- Add API contract checks for frontend/ backend compatibility
- Add deployment smoke tests for Vercel + Railway

## Recommended Immediate Work

1. Add `analytics/summary` usage to more frontend views
2. Add a backend `research` route that returns one battleground state bundle
3. Move cached public JSON loading behind FastAPI
4. Add unit tests for lead-lag, volatility, and correlation
