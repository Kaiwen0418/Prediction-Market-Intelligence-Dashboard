# Polymarket Agent Integration Workflow

Every new external endpoint should go through the same sequence before it is used in UI code.

## 1. Feasibility Check

- confirm the endpoint exists and is documented
- confirm required identifiers are already available in local domain models
- confirm auth, rate limit, and CORS expectations
- confirm whether the endpoint is suitable for client-side use

## 2. Config Validation

- validate base URL format
- validate required slug / token id / query params before request
- fail fast on malformed config instead of attempting fetch

## 3. Reachability Probe

- send the request through a single shared request helper
- classify transport failure separately from payload failure
- record diagnostics for the source so UI and logs can show why fallback happened

## 4. Payload Validation

- validate raw JSON shape before normalization
- reject partial payloads that would silently produce bad domain data
- store validation issue by stage: `config`, `reachability`, `payload`, `normalization`

## 5. Normalization

- convert upstream fields into typed domain objects
- if normalization produces empty or invalid critical fields, treat it as a validation failure

## 6. Fallback Policy

- only fallback when there is an explicit validation or reachability issue
- persist the reason in diagnostics
- surface live vs mock state in the UI

## 7. UI Contract

- pages should never guess whether data is live
- pages read diagnostics from the shared source-status store
- source status should be visible wherever live data matters
