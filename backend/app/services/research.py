import json
from functools import lru_cache
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import HTTPException

from app.analytics.series import (
    calculate_correlation,
    calculate_divergence,
    calculate_event_window,
    calculate_lead_lag,
    calculate_rolling_correlation,
    calculate_volatility,
)
from app.schemas.analytics import EventWindowRequest, LeadLagRequest
from app.schemas.research import (
    ResearchHighlightsResponse,
    PollPointResponse,
    ResearchProvenanceResponse,
    ResearchStateSummaryResponse,
    TimePointResponse,
)

Party = Literal["Democrat", "Republican"]

ROOT_DIR = Path(__file__).resolve().parents[3]
STATE_SUPPORT_PATH = ROOT_DIR / "public" / "data" / "state-party-support-2024.json"
POLYMARKET_HISTORY_PATH = ROOT_DIR / "public" / "data" / "polymarket-history-2024.json"

STATE_REGISTRY = {
    "Arizona": {
        "eventSlug": "arizona-presidential-election-winner",
    },
    "Georgia": {
        "eventSlug": "georgia-presidential-election-winner",
    },
    "Michigan": {
        "eventSlug": "michigan-presidential-election-winner",
    },
    "Pennsylvania": {
        "eventSlug": "pennsylvania-presidential-election-winner",
    },
    "Wisconsin": {
        "eventSlug": "wisconsin-presidential-election-winner",
    },
}


@lru_cache
def _load_json(path: Path) -> Any:
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"Dataset not found: {path.name}")
    return json.loads(path.read_text())


def _normalize_poll_series(dataset: dict[str, Any], state: str, party: Party) -> list[PollPointResponse]:
    state_data = next((entry for entry in dataset["states"] if entry["state"] == state), None)
    if not state_data:
        return []

    normalized: list[PollPointResponse] = []
    for point in state_data["series"]:
        support = point.get("republican") if party == "Republican" else point.get("democrat")
        if not isinstance(support, (int, float)):
            continue
        normalized.append(
            PollPointResponse(
                timestamp=f"{point['date']}T00:00:00.000Z",
                pollAverage=float(support),
                sampleSize=0,
                source="FiveThirtyEight cleaned public dataset",
                sourceUrl="https://github.com/kevin-claw-agent/poll-data",
                fieldDateLabel=point["date"],
                methodology="Daily mean across all available 538 poll rows for the same state, date, and party",
                candidate=party,
            )
        )

    return normalized


def _normalize_market_series(dataset: dict[str, Any], state: str, party: Party) -> tuple[str, list[TimePointResponse]]:
    state_data = next((entry for entry in dataset["states"] if entry["state"] == state), None)
    if not state_data:
        return STATE_REGISTRY[state]["eventSlug"], []

    party_payload = state_data.get("parties", {}).get(party)
    series = []
    if party_payload and isinstance(party_payload, dict):
        series = [
            TimePointResponse(timestamp=point["timestamp"], value=float(point["value"]))
            for point in party_payload.get("series", [])
            if isinstance(point.get("value"), (int, float))
        ]

    return state_data.get("eventSlug", STATE_REGISTRY[state]["eventSlug"]), series


def get_research_summary(state: str, party: Party) -> ResearchStateSummaryResponse:
    if state not in STATE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Unsupported battleground state: {state}")

    poll_dataset = _load_json(STATE_SUPPORT_PATH)
    market_dataset = _load_json(POLYMARKET_HISTORY_PATH)

    poll_series = _normalize_poll_series(poll_dataset, state, party)
    event_slug, market_series = _normalize_market_series(market_dataset, state, party)

    if len(poll_series) < 2 or len(market_series) < 2:
        raise HTTPException(
            status_code=422,
            detail=f"Insufficient history for state={state} party={party}: poll={len(poll_series)} market={len(market_series)}",
        )

    analytics_payload = LeadLagRequest(
        market=[{"timestamp": point.timestamp, "value": point.value} for point in market_series],
        polling=[{"timestamp": point.timestamp, "value": point.poll_average} for point in poll_series],
        maxLagDays=7,
    )
    lead_lag = calculate_lead_lag(analytics_payload)
    correlation = calculate_correlation(analytics_payload)
    volatility = calculate_volatility([point.value for point in market_series])
    divergence = calculate_divergence(analytics_payload)
    rolling_correlation = calculate_rolling_correlation(analytics_payload)
    market_values = [point.value for point in market_series]
    if len(market_values) > 1:
        deltas = [abs(market_values[index] - market_values[index - 1]) for index in range(1, len(market_values))]
        anchor_index = deltas.index(max(deltas)) + 1
    else:
        anchor_index = 0
    event_window = calculate_event_window(
        EventWindowRequest(
            series=[{"timestamp": point.timestamp, "value": point.value} for point in market_series],
            anchorIndex=anchor_index,
            preWindow=3,
            postWindow=3,
        )
    )

    return ResearchStateSummaryResponse(
        state=state,
        eventSlug=event_slug,
        party=party,
        summary=(
            f"FiveThirtyEight {party} state support matched against a cached Polymarket history snapshot for {state}, "
            "with lead-lag, correlation, volatility, divergence, and rolling-correlation computed by the FastAPI + NumPy backend."
        ),
        analyticsSource="api",
        researchSource="api",
        marketSeries=market_series,
        pollSeries=poll_series,
        leadLag=lead_lag,
        correlation=correlation,
        volatility=volatility,
        divergence=divergence,
        rollingCorrelation=rolling_correlation,
        eventWindow=event_window,
        provenance=ResearchProvenanceResponse(
            computedAt=datetime.now(timezone.utc).isoformat(),
            pollDatasetGeneratedAt=poll_dataset.get("generatedAt"),
            marketDatasetGeneratedAt=market_dataset.get("generatedAt"),
        ),
        researchHighlights=ResearchHighlightsResponse(
            shockLabel=(
                f"Primary shock window moved {event_window.net_move:+.2f} pts around "
                f"{event_window.anchor_timestamp[:10]}"
            ),
            leadLagLabel=lead_lag.interpretation,
            divergenceLabel=(
                f"Current market-poll divergence is {divergence.current_gap:.2f} pts "
                f"(max {divergence.max_gap:.2f} pts)"
            ),
        ),
        sourceUrls=[
            "/data/state-party-support-2024.json",
            "/data/polymarket-history-2024.json",
        ],
    )
