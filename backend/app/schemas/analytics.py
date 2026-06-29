from pydantic import BaseModel, Field


class NumericSeriesPoint(BaseModel):
    timestamp: str
    value: float


class EventWindowRequest(BaseModel):
    series: list[NumericSeriesPoint]
    anchor_index: int = Field(alias="anchorIndex", ge=0)
    pre_window: int = Field(default=3, alias="preWindow", ge=1, le=30)
    post_window: int = Field(default=3, alias="postWindow", ge=1, le=30)

    model_config = {"populate_by_name": True}


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


class RollingCorrelationPointResponse(BaseModel):
    timestamp: str
    coefficient: float


class RollingCorrelationResponse(BaseModel):
    coefficient: float
    window_size: int = Field(alias="windowSize")
    points: list[RollingCorrelationPointResponse] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class EventWindowResponse(BaseModel):
    anchor_index: int = Field(alias="anchorIndex")
    anchor_timestamp: str = Field(alias="anchorTimestamp")
    pre_change: float = Field(alias="preChange")
    post_change: float = Field(alias="postChange")
    net_move: float = Field(alias="netMove")
    pre_window: int = Field(alias="preWindow")
    post_window: int = Field(alias="postWindow")

    model_config = {"populate_by_name": True}


class AnalyticsSummaryResponse(BaseModel):
    lead_lag: LeadLagResponse = Field(alias="leadLag")
    correlation: CorrelationResponse
    volatility: VolatilityResponse
    divergence: DivergenceResponse
    rolling_correlation: RollingCorrelationResponse = Field(alias="rollingCorrelation")
    event_window: EventWindowResponse = Field(alias="eventWindow")

    model_config = {"populate_by_name": True}
