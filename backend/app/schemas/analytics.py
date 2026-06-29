from pydantic import BaseModel, Field


class NumericSeriesPoint(BaseModel):
    timestamp: str
    value: float


class LeadLagRequest(BaseModel):
    market: list[NumericSeriesPoint]
    polling: list[NumericSeriesPoint]
    max_lag_days: int = Field(default=7, alias="maxLagDays", ge=1, le=30)

    model_config = {"populate_by_name": True}


class LeadLagResponse(BaseModel):
    lag_days: int = Field(alias="lagDays")
    score: float
    interpretation: str

    model_config = {"populate_by_name": True}


class VolatilityResponse(BaseModel):
    realized_volatility: float = Field(alias="realizedVolatility")
    average_return: float = Field(alias="averageReturn")

    model_config = {"populate_by_name": True}


class CorrelationResponse(BaseModel):
    coefficient: float
    strength: str


class DivergenceResponse(BaseModel):
    average_gap: float = Field(alias="averageGap")
    max_gap: float = Field(alias="maxGap")
    current_gap: float = Field(alias="currentGap")

    model_config = {"populate_by_name": True}


class RollingCorrelationResponse(BaseModel):
    coefficient: float
    window_size: int = Field(alias="windowSize")

    model_config = {"populate_by_name": True}


class AnalyticsSummaryResponse(BaseModel):
    lead_lag: LeadLagResponse = Field(alias="leadLag")
    correlation: CorrelationResponse
    volatility: VolatilityResponse
    divergence: DivergenceResponse
    rolling_correlation: RollingCorrelationResponse = Field(alias="rollingCorrelation")

    model_config = {"populate_by_name": True}
