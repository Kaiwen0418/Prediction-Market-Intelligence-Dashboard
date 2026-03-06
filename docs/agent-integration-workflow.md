# Agent Integration Workflow

This project should not add new external data sources by directly calling endpoints from page or hook code.

## Required sequence before any new API is consumed

1. Feasibility
   Confirm docs, client-side suitability, identifiers, CORS, and rate-limit constraints.
2. Config validation
   Validate base URLs, slugs, token ids, and required query params before network calls.
3. Reachability
   Use a shared request helper and classify transport failure separately from schema failure.
4. Payload validation
   Validate raw JSON shape before normalization.
5. Normalization
   Convert upstream data into typed domain objects only after payload validation passes.
6. Diagnostics
   Record `live`, `fallback`, or `failed` status plus the exact validation stage and message.
7. UI visibility
   Surface source status in the relevant page so mock fallback is explicit.

## Current implementation

- Polymarket live adapters now run through preflight validation in [rest.ts](/../src/services/polymarket/rest.ts)
- Validation rules live in [preflight.ts](/../src/services/polymarket/preflight.ts)
- Source diagnostics are stored in [dataSourceStore.ts](/../src/stores/dataSourceStore.ts)
- UI status cards are rendered from [SourceStatusCard.tsx](/../src/components/layout/SourceStatusCard.tsx)

## Rule for future agents

When adding polling, news, or any other source:

- do not fetch directly in page components
- do not trust upstream JSON without payload validation
- do not silently fallback without storing the reason
- do not expose derived analytics unless the underlying source status is known
