from fastapi import APIRouter

from app.analytics.series import calculate_correlation, calculate_lead_lag, calculate_volatility
from app.schemas.analytics import CorrelationResponse, LeadLagRequest, LeadLagResponse, VolatilityResponse

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
