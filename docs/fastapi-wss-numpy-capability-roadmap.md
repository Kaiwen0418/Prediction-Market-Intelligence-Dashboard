# FastAPI + WSS + NumPy Capability Roadmap

## Goal

Build the project into a Polymarket-only market intelligence system where:

- `FastAPI` owns aggregation, normalization, caching, and service contracts
- `WSS` owns realtime market-state ingestion
- `NumPy` owns time-series and microstructure analytics

The frontend should progressively become a presentation layer over backend-owned market context.

## Capability Map

### FastAPI

Use FastAPI to demonstrate:

- upstream API aggregation
- typed response contracts
- service-layer orchestration
- background tasks and lifecycle management
- cached dataset loading
- debug and health surfaces

Target backend-owned routes:

- `/api/polymarket/market-context`
- `/api/polymarket/orderbook-summary`
- `/api/live/status`
- `/api/live/market-snapshot`
- `/api/research/states/{state}/summary`

### WSS

Use Polymarket websocket data to demonstrate:

- long-lived backend connection management
- reconnect and heartbeat handling
- initial snapshot + delta merge
- in-memory orderbook state maintenance
- realtime signal refresh independent from the frontend tab lifecycle
- backend-owned fanout to the frontend instead of direct browser subscriptions

### Backend-to-Frontend Realtime Transport

Recommended rollout:

1. backend consumes Polymarket WSS
2. frontend reads backend snapshots
3. frontend upgrades to backend `SSE`
4. only add backend `WebSocket` if true bidirectional control is needed

Why start with `SSE`:

- one-way push matches the current UI need
- simpler than maintaining a second websocket protocol
- works well with FastAPI
- still clearly demonstrates realtime backend delivery

### NumPy

Use NumPy to demonstrate:

- lead-lag and correlation
- rolling correlation
- volatility and shock windows
- orderbook imbalance and trade pressure
- microprice / spread regime / liquidity concentration
- market-derived event annotation

## Product Surfaces

### `/market`

Primary showcase for:

- live market context
- realtime orderbook state
- market-derived annotations
- WSS health and freshness
- microstructure signals

### `/history`

Primary showcase for:

- historical analytics
- state-by-state research comparison
- event windows and rolling metrics
- cached research bundle served by FastAPI

## Delivery Phases

### Phase 1: Backend Live Stream Foundation

Target:

- FastAPI background manager for Polymarket WSS
- subscribe to the featured market token
- maintain connection status and latest event metadata
- expose:
  - `/api/live/status`
  - `/api/live/market-snapshot`

Deliverables:

- backend stream manager
- startup / shutdown lifecycle hooks
- stream status schema
- live debug route

### Phase 2: Realtime Microstructure Analytics

Target:

- derive metrics from stream-maintained orderbook state
- compute metrics with NumPy
- expose them through backend snapshots and SSE

Metrics:

- spread
- best bid / best ask / mid
- total bid depth / total ask depth
- imbalance
- trade pressure
- microprice
- recent realized volatility

Frontend use:

- right rail on `/market`
- source freshness and stream latency display
- live SSE updates without direct Polymarket browser subscriptions

### Phase 3: Historical Replay and Shock Analysis

Target:

- replay historical contract path through backend-owned contracts
- automatic market-derived event extraction

Deliverables:

- replay route
- shock route
- rolling analytics overlays
- event window summaries

### Phase 4: Unified Intelligence Context

Target:

- one route should drive most of `/market`

Suggested contract:

- `featuredMarket`
- `orderbookSummary`
- `priceHistoryMeta`
- `timelineEvents`
- `liveStreamStatus`
- `freshness`
- `sourceDiagnostics`

### Phase 5: Production-Grade Operations

Target:

- caching and refresh metadata
- structured logging
- replay fixtures
- stronger backend tests
- better deploy observability

Deliverables:

- readiness vs health checks
- stream reconnect counters
- last successful refresh metadata
- route-level regression tests

## Immediate Next Tasks

1. Add TTL / LRU cleanup for per-slug live stream registry.
2. Surface backend microstructure metrics in the `/market` right rail.
3. Add rolling shock / volatility windows from cached price history.
4. Persist sampled live metrics for short replay and debugging.
5. Add route-level tests for `slug`-scoped SSE and snapshot contracts.
6. Add structured stream logs and reconnect reason reporting.

## Validation Checklist

### Backend

- `/health` returns `ok`
- `/api/live/status` responds even if the stream is disconnected
- `/api/live/market-snapshot` returns:
  - stream status
  - summary or explicit empty-state payload
- `/api/live/stream` emits valid SSE frames
- closing the browser/client must not crash the backend stream manager

### Frontend

- `/market` still renders if stream routes are unavailable
- source diagnostics clearly distinguish:
  - REST context
  - websocket status
  - fallback state

## Notes

- Keep Polymarket as the only upstream for the live market surface.
- Prefer backend aggregation over adding more frontend orchestration.
- When analytics semantics change, update both backend tests and frontend fallback wording.
