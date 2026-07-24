# GMGN-Style Political Map Product Roadmap

## Product Thesis

Build a political prediction-market intelligence terminal where the map is the scanner. Users should see where unusual money is moving, select a colored region, understand the signal, and open the relevant trading pair without browsing a wall of election cards.

The product borrows GMGN's useful mental model: rank markets by abnormal activity and make the reason for each alert inspectable. It does not copy token-trading mechanics or present unverified wallet behavior as fact.

## Product Principles

- The map is the primary navigation surface.
- A region is colored only when it has a configured, active trading pair.
- Color communicates signal severity; selection uses an outline and never destroys the color meaning.
- Every alert explains what changed, how unusual it is, and which market is affected.
- Static fixtures, delayed data, and live detections are visibly distinguished.
- One primary pair represents each region on the map. Secondary pairs belong in the selected-region rail.

## Core User Loop

1. Open the global political activity map.
2. Scan regions ranked by abnormal-activity color.
3. Select a region.
4. Inspect the pair, probability, liquidity, signal score, and supporting evidence.
5. Add the region or market to a watchlist, or continue to the execution venue.
6. Receive an alert when the signal changes materially.

## Signal Model

The initial activity score is a 0-100 composite:

```text
activity score =
  30% volume anomaly
  25% order-flow imbalance
  20% probability velocity
  15% wallet concentration
  10% poll or related-market divergence
```

Severity thresholds:

| Score | Severity | Map treatment |
| --- | --- | --- |
| 0-49 | Normal | Blue |
| 50-69 | Elevated | Amber |
| 70-84 | High | Coral |
| 85-100 | Critical | Red |

The score must include component values, baseline window, observation time, source mode, and confidence before it is promoted from fixture to live.

## Information Architecture

### Global Map

- Country selector and political category filters
- Region fills driven by activity score
- Signal legend and source freshness
- Click selection with stable zoom behavior
- Ranked abnormal-activity feed

### Selected Region Rail

- Primary trading pair and current probability
- 1-hour, 24-hour, and 7-day changes
- Volume, liquidity, spread, and resolution date
- Active signal score and explanation
- Large trades and wallet concentration
- Related markets, polls, and political catalysts

### Market Detail

- Probability and volume history
- Order book and trade tape
- Signal timeline with component attribution
- Cross-market and polling divergence
- Resolution rules and venue links

## Delivery Plan

### Phase 1: Signal-Driven Map Foundation

Status: complete

- Replace hard-coded region tones with typed signal snapshots.
- Add severity scoring, a stable palette, and map legend.
- Preserve severity color while a region is selected.
- Show signal type, score, explanation, and fixture/live provenance in the rail.
- Add unit tests for score thresholds.

Acceptance criteria:

- Every configured region renders from the same signal contract.
- Selection does not change the meaning of the region color.
- Fixture signals are never labeled live.
- Typecheck, UI tests, and production build pass.

### Phase 2: Backend Signal API

Status: complete

- Add FastAPI region-market registry and signal response schemas.
- Calculate volume anomaly, price velocity, order-flow imbalance, and liquidity stress.
- Return score components, confidence, baseline window, and timestamps.
- Cache rolling baselines and expose freshness/degradation states.
- Replace frontend fixtures progressively, retaining a clear fallback mode.

Acceptance criteria:

- The map can load all region signals in one request.
- Signal scores are reproducible from returned components.
- Partial upstream failures do not blank the map.
- Stale data is visibly marked.

### Phase 3: Abnormal Activity Feed

Status: complete

- Rank signals by severity, freshness, liquidity, and confidence.
- Add filters for country, signal type, threshold, and time window.
- Synchronize feed selection with map selection and URL state.
- Add watchlists and browser notification preferences.

Acceptance criteria:

- A user can reach any critical signal in one click.
- Map, feed, and selected rail always show the same region and pair.
- Filters are shareable through the URL.

### Phase 4: Whale and Smart-Money Intelligence

Status: complete

- Normalize public trade and wallet activity where venue data permits.
- Detect large trades relative to market depth and historical trade size.
- Track wallet concentration and coordinated directional flow.
- Introduce wallet reputation only after sufficient resolved-market history.
- Explain uncertainty and avoid identity claims.

Acceptance criteria:

- Whale labels are based on transparent relative thresholds.
- Wallet scores show sample size and resolved-market history.
- No alert implies insider activity without verifiable evidence.
- Reputation requires five distinct resolved markets and combines 70% directional hit rate with 30% bounded realized return.

### Phase 5: Multi-Country Political Maps

Status: complete

- Generalize map configuration to country-specific GeoJSON or TopoJSON.
- Add country, region, feature-ID, projection, and market-registry adapters.
- Launch countries only when reliable market coverage exists.
- Start with the UK or Canada, then add countries based on venue liquidity.
- Keep official boundary provenance visible in the map legend.

Acceptance criteria:

- Adding a country does not require changes to shared signal UI.
- Unsupported regions remain neutral and non-interactive.
- Country switching clears invalid selection and preserves filters.

### Phase 6: Divergence and Catalyst Intelligence

Status: complete

- Compare prediction markets with polling, related contracts, and election models.
- Detect logically inconsistent probabilities across related markets.
- Correlate repricing windows with political news and scheduled events.
- Add human-readable catalyst summaries with source links.

Acceptance criteria:

- Divergence alerts name both compared sources and their timestamps.
- Related-market calculations account for fees and liquidity.
- Automated catalyst summaries remain traceable to source events.
- Related-outcome checks expose both observation timestamps, fee assumptions, and liquidity gating.

### Phase 7: Product Design and Decision Workflow

Status: complete

- Open directly into the map, scanner, and selected-market context instead of a marketing hero.
- Make live, delayed, fallback, and fixture provenance visible before users inspect a signal.
- Label the highest-priority anomalies directly on the map with score and pair context.
- Keep the country overview stable while region selection updates the outline and detail rail.
- Preserve a clear detect, select, validate, and act workflow across desktop and mobile.
- Add watchlist and venue actions to the selected-market rail.
- Move deep evidence into focused views so mobile does not render every chart at once.
- Replace unlabeled diagnostics with an inspectable source-status summary.

Acceptance criteria:

- The first desktop viewport contains at least one actionable signal and the map.
- Mobile reaches the ranked anomaly scanner before the geographic visualization.
- Every selected market shows its source mode and update time.
- Pair-specific metrics are never rendered for a fallback market that does not match the selected region.
- The map communicates its highest-priority anomalies without requiring legend cross-reference.
- Selecting a region does not remove neighboring signals from geographic context.
- Users can watch a region or open its matching venue market from the selected rail.
- Only one deep evidence view is expanded at a time.

## Deployment and Operations

- Frontend: Vercel preview and production deployments.
- Backend and scheduled signal workers: Railway.
- CI: typecheck, UI tests, backend tests, and Next.js production build.
- Observability: endpoint latency, upstream error rate, signal freshness, stream reconnects, and fixture fallback usage.

## Immediate Next Work

- [x] Complete Phase 1 and validate the map interaction.
- [x] Define the FastAPI `RegionSignal` and `SignalComponent` schemas.
- [x] Add a batch `/api/signals/regions` endpoint backed by current stream metrics.
- [x] Replace the selected live region's fixture signal when enough backend samples are available.
- [x] Add the first ranked abnormal-activity feed with threshold filtering and map selection.
- [x] Add signal-type and time-window filters with URL persistence.
- [x] Add persistent region watchlists, watched-only filtering, and opt-in browser notification preferences.
- [x] Detect large public trades using transparent median-size and executable-depth thresholds.
- [x] Remove synthetic wallet identities and placeholder whale-buy claims.
- [x] Normalize documented public proxy-wallet trades and add sample-gated concentration scoring.
- [x] Replace the Home hero with a product-first market intelligence shell.
- [x] Add explicit source provenance, in-map anomaly labels, and selected-market actions.
- [x] Reduce mobile depth with scanner-first ordering and tabbed evidence views.
- [x] Withhold pair-specific metrics and charts when regional market coverage does not match.
- [x] Keep the country map camera stable while selecting regional trading pairs.
- [x] Add the United Kingdom regional map, political-pair registry, signal fixtures, and ONS boundary provenance.
- [x] Cache unchanged replay baselines and expose stale signal degradation through the API and scanner.
- [x] Gate wallet reputation behind five resolved markets and expose the resolved-history sample.
- [x] Add fee-aware related-market consistency checks and source-linked political catalyst windows.
- [x] Add a timestamped polling-derived election-model baseline for market comparison.
