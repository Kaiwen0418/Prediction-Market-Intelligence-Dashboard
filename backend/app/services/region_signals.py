from dataclasses import dataclass
from datetime import datetime, timezone

from app.analytics.signals import calculate_region_activity_score, get_signal_severity
from app.schemas.signals import (
    RegionSignalResponse,
    RegionSignalsResponse,
    SignalComponentResponse,
)
from app.streaming.polymarket_ws import live_stream_manager


@dataclass(frozen=True)
class RegionSignalFixture:
    region_code: str
    country_code: str
    market_slug: str
    kind: str
    score: int
    headline: str
    detail: str
    observed_at: str


REGION_SIGNAL_FIXTURES = (
    RegionSignalFixture(
        "TX",
        "US",
        "texas-republican-senate-primary-winner",
        "whale-flow",
        92,
        "Whale-sized directional flow",
        "Large directional trades and one-sided depth make this the highest-priority region in the demo scanner.",
        "2026-07-24T09:40:00Z",
    ),
    RegionSignalFixture(
        "AZ",
        "US",
        "arizona-presidential-election-winner",
        "price-move",
        46,
        "Price action within normal range",
        "Movement remains below the abnormal-activity threshold.",
        "2026-07-24T09:36:00Z",
    ),
    RegionSignalFixture(
        "GA",
        "US",
        "georgia-presidential-election-winner",
        "normal",
        31,
        "No material anomaly",
        "Trading activity is close to its recent baseline.",
        "2026-07-24T09:34:00Z",
    ),
    RegionSignalFixture(
        "MI",
        "US",
        "michigan-presidential-election-winner",
        "volume-anomaly",
        55,
        "Volume beginning to accelerate",
        "Recent activity is elevated but has not reached a high-conviction threshold.",
        "2026-07-24T09:38:00Z",
    ),
    RegionSignalFixture(
        "PA",
        "US",
        "pennsylvania-presidential-election-winner",
        "poll-divergence",
        72,
        "Market and polling paths diverge",
        "The market-implied outcome has moved away from the latest polling baseline.",
        "2026-07-24T09:39:00Z",
    ),
    RegionSignalFixture(
        "WI",
        "US",
        "wisconsin-presidential-election-winner",
        "normal",
        38,
        "Order flow remains balanced",
        "No unusual concentration or probability shock is present.",
        "2026-07-24T09:31:00Z",
    ),
    RegionSignalFixture(
        "FL",
        "US",
        "florida-presidential-election-winner",
        "poll-divergence",
        63,
        "Moderate polling divergence",
        "Market pricing is separating from the regional polling baseline.",
        "2026-07-24T09:32:00Z",
    ),
    RegionSignalFixture(
        "CA",
        "US",
        "california-governor-election-2026",
        "volume-anomaly",
        79,
        "Unusual volume concentration",
        "Turnover is concentrated in a short window relative to the demo baseline.",
        "2026-07-24T09:41:00Z",
    ),
    RegionSignalFixture(
        "SCT",
        "GB",
        "will-scotland-hold-an-independence-referendum-before-2030",
        "poll-divergence",
        74,
        "Referendum pricing diverges from polling",
        "The configured contract is trading away from the latest constitutional polling baseline.",
        "2026-07-24T10:05:00Z",
    ),
    RegionSignalFixture(
        "LDN",
        "GB",
        "next-london-mayoral-election-winner",
        "volume-anomaly",
        68,
        "Mayoral market volume is elevated",
        "Recent turnover is above the configured London political-market baseline.",
        "2026-07-24T10:02:00Z",
    ),
    RegionSignalFixture(
        "WLS",
        "GB",
        "welsh-parliament-election-most-seats",
        "price-move",
        57,
        "Senedd pricing is repricing",
        "The leading-outcome probability has moved faster than its recent baseline.",
        "2026-07-24T09:58:00Z",
    ),
    RegionSignalFixture(
        "NIR",
        "GB",
        "northern-ireland-assembly-election-most-seats",
        "order-flow",
        43,
        "Assembly market flow remains balanced",
        "Directional activity remains below the abnormal-flow threshold.",
        "2026-07-24T09:55:00Z",
    ),
)


def _fixture_response(fixture: RegionSignalFixture) -> RegionSignalResponse:
    return RegionSignalResponse(
        regionCode=fixture.region_code,
        countryCode=fixture.country_code,
        marketSlug=fixture.market_slug,
        kind=fixture.kind,
        score=fixture.score,
        severity=get_signal_severity(fixture.score),
        headline=fixture.headline,
        detail=fixture.detail,
        observedAt=fixture.observed_at,
        source="fixture",
        confidence=0.0,
        baselineWindow="curated demo snapshot",
        components=[],
    )


def _live_headline(kind: str) -> str:
    if kind == "volume-anomaly":
        return "Trade intensity is accelerating"
    if kind == "order-flow":
        return "One-sided order flow is building"
    if kind == "price-move":
        return "Probability is repricing quickly"
    return "Live activity is above baseline"


async def build_region_signals(
    country_code: str,
    active_slug: str | None = None,
) -> RegionSignalsResponse:
    normalized_country = country_code.strip().upper()
    fixtures = [fixture for fixture in REGION_SIGNAL_FIXTURES if fixture.country_code == normalized_country]
    signals = [_fixture_response(fixture) for fixture in fixtures]

    active_fixture = next((fixture for fixture in fixtures if fixture.market_slug == active_slug), None)
    if active_fixture is not None:
        try:
            snapshot = await live_stream_manager.get_snapshot(active_slug)
            replay = await live_stream_manager.get_replay(active_slug, limit=60)
        except Exception:
            snapshot = None
            replay = None

        activity = (
            calculate_region_activity_score(replay.samples)
            if replay is not None and replay.source == "stream"
            else None
        )

        if activity is not None and snapshot is not None and snapshot.microstructure is not None and replay is not None:
            components = [
                SignalComponentResponse(
                    key=component.key,
                    label=component.label,
                    value=component.value,
                    weight=component.weight,
                    contribution=component.contribution,
                    available=component.available,
                    detail=component.detail,
                )
                for component in activity.components
            ]
            live_signal = RegionSignalResponse(
                regionCode=active_fixture.region_code,
                countryCode=active_fixture.country_code,
                marketSlug=active_fixture.market_slug,
                kind=activity.kind,
                score=activity.score,
                severity=get_signal_severity(activity.score),
                headline=_live_headline(activity.kind),
                detail=(
                    f"Computed from {len(replay.samples)} live stream samples. "
                    f"{sum(component.available for component in activity.components)} of "
                    f"{len(activity.components)} signal components are available."
                ),
                observedAt=replay.samples[-1].timestamp,
                source="live",
                confidence=activity.confidence,
                baselineWindow=f"{len(replay.samples)} stream samples",
                components=components,
            )
            signals = [
                live_signal if signal.region_code == active_fixture.region_code else signal
                for signal in signals
            ]

    live_count = sum(signal.source == "live" for signal in signals)
    source = "live" if live_count == len(signals) and signals else "mixed" if live_count else "fixture"
    return RegionSignalsResponse(
        countryCode=normalized_country,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        source=source,
        signals=signals,
    )
