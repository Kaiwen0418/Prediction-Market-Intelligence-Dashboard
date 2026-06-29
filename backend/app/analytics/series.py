import math

import numpy as np

from app.schemas.analytics import (
    CorrelationResponse,
    DivergenceResponse,
    EventWindowRequest,
    EventWindowResponse,
    LeadLagRequest,
    LeadLagResponse,
    RollingCorrelationResponse,
    VolatilityResponse,
)


def _as_arrays(payload: LeadLagRequest) -> tuple[np.ndarray, np.ndarray]:
    length = min(len(payload.market), len(payload.polling))
    market = np.array([point.value for point in payload.market[:length]], dtype=float)
    polling = np.array([point.value for point in payload.polling[:length]], dtype=float)
    return market, polling


def _correlation(left: np.ndarray, right: np.ndarray) -> float:
    length = min(left.size, right.size)
    if length < 2:
        return 0.0

    a = left[:length]
    b = right[:length]
    a_centered = a - a.mean()
    b_centered = b - b.mean()
    denominator = math.sqrt(float(np.dot(a_centered, a_centered) * np.dot(b_centered, b_centered)))
    if denominator == 0:
        return 0.0
    return float(np.dot(a_centered, b_centered) / denominator)


def calculate_lead_lag(payload: LeadLagRequest) -> LeadLagResponse:
    market, polling = _as_arrays(payload)
    best_lag = 0
    best_score = -1.0

    for lag in range(-payload.max_lag_days, payload.max_lag_days + 1):
        if lag >= 0:
            shifted_market = market[lag:]
            shifted_polling = polling[: polling.size - lag] if lag else polling
        else:
            shifted_market = market[:lag]
            shifted_polling = polling[-lag:]

        score = _correlation(shifted_market, shifted_polling)
        if score > best_score:
            best_score = score
            best_lag = lag

    if best_lag > 0:
        interpretation = f"Market leads polls by {best_lag} day{'s' if best_lag != 1 else ''}"
    elif best_lag < 0:
        interpretation = f"Polls lead market by {abs(best_lag)} day{'s' if best_lag != -1 else ''}"
    else:
        interpretation = "Market and polling move in sync"

    return LeadLagResponse(lagDays=best_lag, score=round(best_score, 3), interpretation=interpretation)


def calculate_volatility(points: list[float]) -> VolatilityResponse:
    if len(points) < 2:
        return VolatilityResponse(realizedVolatility=0.0, averageReturn=0.0)

    values = np.array(points, dtype=float)
    returns = np.diff(values)
    realized_volatility = float(np.std(returns) * math.sqrt(365) * 100)
    average_return = float(np.mean(returns) * 100)
    return VolatilityResponse(
        realizedVolatility=round(realized_volatility, 2),
        averageReturn=round(average_return, 2),
    )


def calculate_correlation(payload: LeadLagRequest) -> CorrelationResponse:
    market, polling = _as_arrays(payload)
    coefficient = _correlation(market, polling)
    absolute = abs(coefficient)
    strength = "strong" if absolute > 0.75 else "moderate" if absolute > 0.4 else "weak"
    return CorrelationResponse(coefficient=round(coefficient, 3), strength=strength)


def calculate_divergence(payload: LeadLagRequest) -> DivergenceResponse:
    market, polling = _as_arrays(payload)
    length = min(market.size, polling.size)
    if length < 1:
        return DivergenceResponse(averageGap=0.0, maxGap=0.0, currentGap=0.0)

    gaps = np.abs(market[:length] - polling[:length])
    return DivergenceResponse(
        averageGap=round(float(np.mean(gaps) * 100), 2),
        maxGap=round(float(np.max(gaps) * 100), 2),
        currentGap=round(float(gaps[-1] * 100), 2),
    )


def calculate_rolling_correlation(payload: LeadLagRequest, window_size: int = 30) -> RollingCorrelationResponse:
    market, polling = _as_arrays(payload)
    length = min(market.size, polling.size)
    if length < 2:
        return RollingCorrelationResponse(coefficient=0.0, windowSize=min(window_size, max(length, 1)))

    effective_window = min(window_size, length)
    coefficient = _correlation(market[-effective_window:], polling[-effective_window:])
    return RollingCorrelationResponse(coefficient=round(coefficient, 3), windowSize=effective_window)


def calculate_event_window(payload: EventWindowRequest) -> EventWindowResponse:
    series = np.array([point.value for point in payload.series], dtype=float)
    if series.size < 2:
        return EventWindowResponse(
            preChange=0.0,
            postChange=0.0,
            netMove=0.0,
            preWindow=payload.pre_window,
            postWindow=payload.post_window,
        )

    anchor = min(payload.anchor_index, series.size - 1)
    pre_start = max(0, anchor - payload.pre_window)
    post_end = min(series.size - 1, anchor + payload.post_window)

    pre_base = series[pre_start]
    anchor_value = series[anchor]
    post_value = series[post_end]

    pre_change = float((anchor_value - pre_base) * 100)
    post_change = float((post_value - anchor_value) * 100)
    net_move = float((post_value - pre_base) * 100)

    return EventWindowResponse(
        preChange=round(pre_change, 2),
        postChange=round(post_change, 2),
        netMove=round(net_move, 2),
        preWindow=payload.pre_window,
        postWindow=payload.post_window,
    )
