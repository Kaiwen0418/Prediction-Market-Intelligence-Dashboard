import math
from datetime import datetime, timedelta, timezone

from app.schemas.live import LiveMetricSampleResponse, LiveReplayResponse, LiveStreamStatusResponse

FIXTURE_LENGTH = 96
FIXTURE_END = datetime(2026, 6, 30, 12, 0, tzinfo=timezone.utc)


def _slug_seed(slug: str) -> int:
    return sum(ord(char) for char in slug) % 997


def build_replay_fixture_samples(slug: str, limit: int = 60) -> list[LiveMetricSampleResponse]:
    bounded_limit = max(1, min(limit, FIXTURE_LENGTH))
    seed = _slug_seed(slug)
    base_price = 0.44 + (seed % 18) / 100
    amplitude = 0.015 + (seed % 7) / 1000
    drift = ((seed % 5) - 2) / 10_000
    phase = (seed % 12) / 3

    samples: list[LiveMetricSampleResponse] = []
    for index in range(FIXTURE_LENGTH):
        timestamp = (FIXTURE_END - timedelta(minutes=(FIXTURE_LENGTH - 1 - index) * 5)).isoformat().replace("+00:00", "Z")
        wave = math.sin((index / 7) + phase) * amplitude
        pulse = math.cos((index / 11) + phase / 2) * (amplitude / 2)
        mid_price = max(0.01, min(0.99, base_price + wave + pulse + drift * index))
        micro_offset = math.sin((index / 5) + phase) * 0.0025
        microprice = max(0.01, min(0.99, mid_price + micro_offset))
        spread_bps = round(120 + abs(math.sin((index / 8) + phase)) * 180, 2)
        depth_skew = round(max(-0.95, min(0.95, math.cos((index / 6) + phase) * 0.38)), 3)
        realized_volatility = round(0.008 + abs(math.sin((index / 9) + phase)) * 0.018, 4)
        trade_intensity = round(10 + abs(math.cos((index / 4) + phase)) * 22, 2)
        order_flow_imbalance = round(max(-0.95, min(0.95, math.sin((index / 6.5) + phase) * 0.52)), 3)
        samples.append(
            LiveMetricSampleResponse(
                timestamp=timestamp,
                midPrice=round(mid_price, 4),
                spreadBps=spread_bps,
                microprice=round(microprice, 4),
                depthSkew=depth_skew,
                realizedVolatility=realized_volatility,
                tradeIntensity=trade_intensity,
                orderFlowImbalance=order_flow_imbalance,
            )
        )

    return samples[-bounded_limit:]


def build_replay_fixture_response(
    status: LiveStreamStatusResponse,
    slug: str,
    limit: int = 60,
) -> LiveReplayResponse:
    samples = build_replay_fixture_samples(slug, limit)
    return LiveReplayResponse(
        status=status,
        samples=samples,
        sampleCount=len(samples),
        source="fixture",
    )
