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

### Phase 8: Interface Hierarchy and Visual Rhythm

Status: complete

- Consolidate brand, page title, context, navigation, and theme controls into one application header.
- Remove decorative full-width rules between page sections and use spacing to communicate hierarchy.
- Keep functional separators for tab state, scanner rows, and dense metric tables.
- Deduplicate selected-market metadata and expose the update time once.
- Preserve mobile access to the alternate primary route without crowding the header.
- Enforce one page-level heading per route.

Acceptance criteria:

- Home and Research use the same single-header structure.
- The map view has no stacked context bar, card header, and module label.
- Desktop and mobile layouts have no horizontal overflow.
- Navigation remains available at mobile widths.
- Heading levels describe the content hierarchy without duplicate `h1` elements.

### Phase 9: Production Status Communication

Status: complete

- Keep healthy data operation quiet and show update time without implementation details.
- Replace source modes and backend diagnostics with impact-based information, warning, and error notices.
- Remove mock, fixture, fallback, framework, and pipeline terminology from customer-facing copy.
- Express delayed data as the latest available information with a clear recency warning.
- Show unavailable regional coverage without exposing mismatched market internals.
- Preserve source diagnostics in application state for development and observability only.

Acceptance criteria:

- No rendered route exposes source mode, backend health, framework names, or fixture labels.
- Informational notices are neutral; delayed data is a warning; unavailable data is an error.
- Notices explain user impact and expected recovery behavior.
- Signal and market timestamps remain visible in plain language.

### Phase 10: Global Map Navigation

Status: complete

- [x] Preserve selected UK market identity when upstream market data is unavailable.
- [x] Provide coherent UK market history and order-book values for all configured regions.
- [x] Replace the country dropdown with a map-based country selection mode.
- [x] Let users move from a world overview into a country map without losing signal filters.
- [x] Preserve country and region selection in the shareable URL.

### Phase 11: Selected-Market Trading Summary

Status: complete

- [x] Calculate 1-hour, 24-hour, and 7-day probability movement from timestamped history.
- [x] Add current probability and movement windows to the selected-region rail.
- [x] Add 24-hour volume and available liquidity in compact market units.
- [x] Withhold movement windows when no suitably timed observation exists.
- [x] Validate the summary across live and latest-available UK market data.

### Phase 12: Contract Resolution Context

Status: complete

- [x] Normalize venue, close time, contract description, and resolution source metadata.
- [x] Show verified venue and close time without fabricating unavailable fallback values.
- [x] Keep detailed resolution guidance collapsed until requested.
- [x] Reject malformed dates and unsafe resolution-source links.
- [x] Validate contract context across live and latest-available market states.

### Phase 13: Market Lifecycle Clarity

Status: complete

- [x] Normalize open, closed, inactive, and unknown lifecycle states from venue flags.
- [x] Mark closed markets beside the primary title and selected-region title.
- [x] Label closed-market probability and volume as historical statistics.
- [x] Replace execution-oriented copy for closed contracts with historical viewing language.
- [x] Keep a verified open political contract as the default market.

### Phase 14: Unified Global Signal Map

Status: complete

- [x] Render a persistent Natural Earth world layer and country-region signal layers in one map canvas.
- [x] Support pointer drag and zoom without switching to separate country map containers.
- [x] Select supported countries or configured regions directly from the world view.
- [x] Default the signal scanner to all countries while preserving selected-country live overrides.
- [x] Add a manual country scope and persist it with map, region, and signal filters in the URL.
- [x] Preserve scanner-first mobile ordering and prevent horizontal map overflow.

### Phase 15: Interruptible Live Map Tour

Status: complete

- [x] Start the default home route on the live world map with global signal scope.
- [x] Rotate through verified-open regions ranked by abnormal activity.
- [x] Move the existing map camera and selected market without mounting a second map.
- [x] Stop rotation after country selection, region selection, pointer drag, or map click.
- [x] Keep explicit shared URLs paused and provide a compact play/pause control.
- [x] Exclude closed and unknown-lifecycle contracts from automatic rotation.

### Phase 16: Europe Political Markets

Status: complete

- [x] Add Europe as a continental map adapter using Natural Earth country boundaries.
- [x] Add open political markets for France, Germany, Spain, Italy, and Iceland.
- [x] Reuse global scanner, watchlist, lifecycle, venue, and URL-selection behavior.
- [x] Add verified-open fallback identity, probability, liquidity, and close-time context.
- [x] Validate Europe focus and global-to-Europe navigation on desktop and mobile.

### Phase 17: Country-Accurate World and Detail Layers

Status: complete

- [x] Replace the synthetic Europe adapter with independent country adapters.
- [x] Show one activity surface and label per configured country at world scale.
- [x] Render only the focused country's subdivisions after selection or auto-tour.
- [x] Add regional boundaries for France and Länder boundaries for Germany.
- [x] Keep national contracts national while preserving internal boundary context.
- [x] Anchor Germany's Berlin market to the Berlin state polygon.

### Phase 18: Global Live Trade Tape

Status: complete

- [x] Proxy the latest public trades without restricting the feed to one contract.
- [x] Normalize market identity, outcome, side, price, size, and timestamp.
- [x] Poll independently from the selected map market without synthetic fallback.
- [x] Rotate recent prints in a compact lower-left map overlay.
- [x] Link each print to its Polymarket event and respect reduced-motion settings.

### Phase 19: Animated Auto-Tour Camera

Status: complete

- [x] Replace automatic camera jumps with staged zoom-out, pan, and zoom-in motion.
- [x] Focus automatic navigation on the selected region rather than only its country.
- [x] Cancel in-flight motion immediately after pointer or manual selection input.
- [x] Debounce the next tour interval until camera motion has settled.
- [x] Keep manual country navigation immediate and deterministic.

### Phase 20: Fullscreen Map Control

Status: complete

- [x] Replace the country-view world button with a compact fullscreen control.
- [x] Group fullscreen and auto-tour controls inside the map.
- [x] Preserve auto-tour state when entering or exiting fullscreen.
- [x] Fill the fullscreen viewport while keeping the ocean matched to the surface.

### Phase 21: Complete Signal Ranking Pagination

Status: complete

- [x] Remove the hidden five-result cap from the global signal ranking.
- [x] Include scores below 50 whenever the Score filter is set to All.
- [x] Add stable rank numbers across paginated results.
- [x] Add result ranges, page jumps, and previous/next controls.
- [x] Reset or clamp pages when filters and result counts change.

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
- [x] Add a compact selected-market trading summary with time-aware movement windows.
- [x] Add verified venue, close-time, and contract-resolution context.
- [x] Distinguish closed contracts from open markets in titles, statistics, and actions.
- [x] Unify world and regional navigation in one pannable map with global signal scope.
- [x] Add an interruptible live tour across verified-open high-activity regions.
- [x] Launch the Europe country-market layer with five open political contracts.
- [x] Split European markets into country-accurate world and regional detail layers.
- [x] Add a rolling all-market live trade tape to the map.
- [x] Animate and debounce region-to-region auto-tour camera movement.
- [x] Add a fullscreen map control beside auto-tour.
- [x] Page the complete signal ranking without hiding normal-score regions.
