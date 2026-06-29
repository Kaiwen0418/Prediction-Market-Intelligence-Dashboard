from pydantic import BaseModel, Field

from app.schemas.analytics import (
    CorrelationResponse,
    DivergenceResponse,
    LeadLagResponse,
    RollingCorrelationResponse,
    VolatilityResponse,
)


class PollPointResponse(BaseModel):
    timestamp: str
    poll_average: float = Field(alias="pollAverage")
    sample_size: int = Field(default=0, alias="sampleSize")
    source: str
    source_url: str | None = Field(default=None, alias="sourceUrl")
    field_date_label: str | None = Field(default=None, alias="fieldDateLabel")
    methodology: str | None = None
    candidate: str | None = None

    model_config = {"populate_by_name": True}


class TimePointResponse(BaseModel):
    timestamp: str
    value: float


class ResearchStateSummaryResponse(BaseModel):
    state: str
    event_slug: str = Field(alias="eventSlug")
    party: str
    summary: str
    analytics_source: str = Field(alias="analyticsSource")
    research_source: str = Field(alias="researchSource")
    market_series: list[TimePointResponse] = Field(alias="marketSeries")
    poll_series: list[PollPointResponse] = Field(alias="pollSeries")
    lead_lag: LeadLagResponse = Field(alias="leadLag")
    correlation: CorrelationResponse
    volatility: VolatilityResponse
    divergence: DivergenceResponse
    rolling_correlation: RollingCorrelationResponse = Field(alias="rollingCorrelation")
    source_urls: list[str] = Field(alias="sourceUrls")

    model_config = {"populate_by_name": True}
