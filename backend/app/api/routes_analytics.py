from fastapi import APIRouter

from app.analytics.series import (
    calculate_correlation,
    calculate_divergence,
    calculate_event_window,
    calculate_lead_lag,
    calculate_rolling_correlation,
    calculate_volatility,
)
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CorrelationResponse,
    EventWindowRequest,
    EventWindowResponse,
    LeadLagRequest,
    LeadLagResponse,
    VolatilityResponse,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.post("/lead-lag", response_model=LeadLagResponse)
async def post_lead_lag(payload: LeadLagRequest) -> LeadLagResponse:
    return calculate_lead_lag(payload)


@router.post("/correlation", response_model=CorrelationResponse)
async def post_correlation(payload: LeadLagRequest) -> CorrelationResponse:
    return calculate_correlation(payload)


@router.post("/volatility", response_model=VolatilityResponse)
async def post_volatility(payload: LeadLagRequest) -> VolatilityResponse:
    return calculate_volatility([point.value for point in payload.market])


@router.post("/event-window", response_model=EventWindowResponse)
async def post_event_window(payload: EventWindowRequest) -> EventWindowResponse:
    return calculate_event_window(payload)


@router.post("/summary", response_model=AnalyticsSummaryResponse)
async def post_summary(payload: LeadLagRequest) -> AnalyticsSummaryResponse:
    anchor_index = 0
    if len(payload.market) > 1:
        diffs = [abs(payload.market[index].value - payload.market[index - 1].value) for index in range(1, len(payload.market))]
        if diffs:
            anchor_index = diffs.index(max(diffs)) + 1

    return AnalyticsSummaryResponse(
        leadLag=calculate_lead_lag(payload),
        correlation=calculate_correlation(payload),
        volatility=calculate_volatility([point.value for point in payload.market]),
        divergence=calculate_divergence(payload),
        rollingCorrelation=calculate_rolling_correlation(payload),
        eventWindow=calculate_event_window(
            EventWindowRequest(
                series=payload.market,
                anchorIndex=anchor_index,
                preWindow=3,
                postWindow=3,
            )
        ),
    )
