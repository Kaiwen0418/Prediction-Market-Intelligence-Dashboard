# Prediction Market Intelligence Dashboard Roadmap

## 1. Goal

Build a frontend-only, production-style prediction market dashboard that demonstrates:

- practical market intelligence workflows
- realtime data ingestion and state synchronization
- client-side analytics and derived metrics
- polished financial-data visualization
- strong frontend engineering structure for GitHub and interview review

## 2. Current Status

The current repo already has a solid architecture skeleton:

- Next.js App Router foundation
- Tailwind styling setup
- TanStack Query provider
- Zustand stores for market, orderbook, and event state
- analytics modules for lead-lag, momentum, volatility, and liquidity
- mock services for market, polling, news, and orderbook data
- mock websocket stream for realtime orderbook updates
- dashboard shell with:
  - market vs poll chart
  - depth chart
  - orderbook table
  - trade tape
  - event timeline

This means the project is no longer at "idea" stage. It is now at "structured prototype" stage.

## 3. Gap Analysis Against Initial Design

The original design described a production-grade frontend architecture. Compared with that target, the remaining work is mainly in these areas:

### 3.1 Data Integration Gaps

Still needed:

- real Polymarket REST adapter
- real Polymarket WebSocket adapter
- real polling data adapter
- real news / event feed adapter
- normalization layer for inconsistent upstream payloads
- API error classification and fallback states

### 3.2 Domain Model Gaps

Still needed:

- richer market entity model
- contract / outcome-level types
- ticker stream message types
- orderbook delta event types
- timeline event tagging and category model
- market-to-event linking model

### 3.3 Analytics Gaps

Still needed:

- correlation module
- trade pressure module
- order flow imbalance module
- event impact detection module
- liquidity regime classification
- market clustering and related-market comparisons
- arbitrage / mispricing detection

### 3.4 Product / UI Gaps

Still needed:

- dedicated `/market`, `/history`, `/timeline` page experiences instead of the same shell reused
- market selector and search
- filter controls for time range, event type, and category
- empty states, error states, and loading skeletons
- responsive refinements for mobile dense data views
- richer visual storytelling in the timeline panel
- drill-down interactions from chart point to event context

### 3.5 Frontend Infrastructure Gaps

Still needed:

- environment config strategy
- typed runtime config for API endpoints
- test coverage
- linting / formatting consistency if expanded
- GitHub Actions CI
- deployment checklist for Vercel
- observability for client-side failures

## 4. Recommended Development Sequence

The next steps should prioritize making the app real before making it bigger.

## 5. Phase Plan

### Phase 1: Stabilize the Frontend Foundation

Objective:
Turn the current prototype into a reliable base for further integration.

Tasks:

- split repeated dashboard shell routing into page-specific containers
- add shared section-level loading skeletons
- add shared error boundary and retry UI
- formalize config constants and query keys
- create data formatting helpers for market, poll, and event payloads
- document mock vs live adapters clearly

Deliverables:

- stable page composition pattern
- clean loading / error handling
- reusable data contracts for future live APIs

Acceptance criteria:

- each major panel can load independently
- errors do not break the entire page
- all service calls are isolated behind adapters

### Phase 2: Replace Mock Data With Live Adapters

Objective:
Make the dashboard useful with real market data while staying frontend-only.

Tasks:

- implement `services/polymarket/rest.ts`
- implement `services/polymarket/ws.ts`
- create market list fetcher and featured market query
- replace mock orderbook snapshots with live snapshot + delta updates
- implement polling source adapter
- implement timeline event ingestion from a public source or curated static feed

Suggested new modules:

- `src/services/polymarket/rest.ts`
- `src/services/polymarket/ws.ts`
- `src/services/polymarket/normalizers.ts`
- `src/services/polling/normalizers.ts`
- `src/services/news/normalizers.ts`
- `src/types/ws.ts`

Deliverables:

- live featured market
- live orderbook
- live trades
- live or semi-live polling/event data

Acceptance criteria:

- market data updates without refresh
- socket reconnect is resilient
- service layer returns normalized typed objects only

### Phase 3: Expand the Analytics Layer

Objective:
Move from "displaying data" to "explaining markets."

Tasks:

- add `correlation.ts`
- add `tradePressure.ts`
- add `orderFlowImbalance.ts`
- add `eventImpact.ts`
- add rolling-window analytics utilities
- define analytics summary cards by module rather than hardcoded dashboard values

Suggested new modules:

- `src/analytics/correlation.ts`
- `src/analytics/tradePressure.ts`
- `src/analytics/orderFlowImbalance.ts`
- `src/analytics/eventImpact.ts`
- `src/analytics/rolling.ts`
- `src/types/analytics.ts` expansion

Deliverables:

- interpretable derived metrics
- consistent analytics output schema
- reusable calculations across pages

Acceptance criteria:

- each metric has clear formula and typed output
- analytics can run from normalized store data only
- dashboard cards are data-driven, not manually assembled

### Phase 4: Build Real Page-Level Experiences

Objective:
Convert the current dashboard shell into a true multi-view product.

Tasks:

- redesign `/market` for realtime microstructure
- redesign `/history` for time-series comparison and lead-lag analysis
- redesign `/timeline` for catalyst-driven interpretation
- add navigation and shared filters
- add market search and market switching
- support query params for sharable state

Suggested new modules:

- `src/components/navigation/TopNav.tsx`
- `src/components/filters/TimeRangeFilter.tsx`
- `src/components/filters/EventTypeFilter.tsx`
- `src/components/market/MarketSelector.tsx`
- `src/app/market/_components/*`
- `src/app/history/_components/*`
- `src/app/timeline/_components/*`

Deliverables:

- distinct page identity
- better information architecture
- more realistic product behavior

Acceptance criteria:

- each route answers a different user question
- filters persist in the URL
- users can switch between markets without a full page reset

### Phase 5: Improve Realtime Performance

Objective:
Make high-frequency updates safe and scalable on the client.

Tasks:

- add event batching for WebSocket updates
- separate raw events from derived orderbook state
- support incremental orderbook updates
- virtualize trade tape if volume increases
- memoize heavy chart transformations only where profiling justifies it
- add reconnect backoff and heartbeat handling

Suggested new modules:

- `src/websocket/messageRouter.ts`
- `src/stores/rawEventStore.ts`
- `src/utils/orderbook.ts`
- `src/hooks/useRealtimeConnection.ts`

Deliverables:

- smoother UI during frequent updates
- safer websocket lifecycle
- easier debugging of market event flow

Acceptance criteria:

- frequent trade updates do not freeze the UI
- reconnect scenarios recover automatically
- raw event stream can be inspected independently from rendered state

### Phase 6: Quality, Testing, and Delivery

Objective:
Make the repo credible as a production-grade frontend project.

Tasks:

- add unit tests for analytics and normalizers
- add component tests for key panels
- add basic integration test for dashboard render
- add CI workflow for install, lint, typecheck, and test
- document deployment and environment variables
- polish README with screenshots and architecture diagrams

Suggested new modules:

- `src/analytics/*.test.ts`
- `src/services/**/*.test.ts`
- `src/components/**/*.test.tsx`
- `.github/workflows/ci.yml`
- `docs/architecture.md`

Deliverables:

- repeatable validation pipeline
- stronger portfolio presentation
- lower regression risk

Acceptance criteria:

- CI passes on every PR
- analytics formulas are tested
- core dashboard panels render under test

## 6. Required Modules To Add Next

If development continues immediately, these are the highest-priority missing modules:

### Must-have next

- `src/services/polymarket/rest.ts`
- `src/services/polymarket/ws.ts`
- `src/services/polymarket/normalizers.ts`
- `src/analytics/correlation.ts`
- `src/analytics/tradePressure.ts`
- `src/websocket/messageRouter.ts`
- `src/components/navigation/TopNav.tsx`
- `src/components/filters/TimeRangeFilter.tsx`
- `.github/workflows/ci.yml`

### Should-have after that

- `src/services/news/normalizers.ts`
- `src/services/polling/normalizers.ts`
- `src/hooks/useRealtimeConnection.ts`
- `src/stores/rawEventStore.ts`
- `docs/architecture.md`
- test files for analytics and service adapters

### Nice-to-have later

- market clustering module
- arbitrage detection module
- event impact scoring module
- alerting / watchlist UI
- compare-multiple-markets workspace

## 7. Suggested Milestones

### Milestone A: Live Data MVP

Scope:

- live featured market
- live orderbook
- live trade tape
- stable loading and error handling

Outcome:
The app becomes a real market monitor instead of a mock prototype.

### Milestone B: Intelligence Dashboard

Scope:

- correlation and trade pressure analytics
- event-to-move timeline interpretation
- route-specific page views

Outcome:
The app starts explaining market behavior, not just displaying it.

### Milestone C: Portfolio-Grade Delivery

Scope:

- tests
- CI
- deployment
- screenshot-rich README
- architecture docs

Outcome:
The repo becomes presentation-ready for GitHub, recruiters, and interviews.

## 8. Recommended Immediate Next Sprint

If only one sprint is planned next, do this:

1. Replace mock Polymarket data with live REST + WebSocket adapters.
2. Add normalization and message routing so data contracts stay stable.
3. Add correlation and trade pressure analytics.
4. Split the current dashboard shell into real `/market`, `/history`, and `/timeline` pages.
5. Add CI with typecheck and at least analytics unit tests.

This sequence gives the best ratio of product usefulness to engineering signal.

## 9. Definition of Done for the Project

The project should be considered close to the original design target when all of the following are true:

- live market and orderbook data are running client-side
- polling and event context are integrated through adapters
- analytics outputs are reusable and tested
- each route has a distinct purpose
- realtime updates are resilient and performant
- CI and deployment are documented and working
- README clearly explains architecture, problem, and engineering decisions
