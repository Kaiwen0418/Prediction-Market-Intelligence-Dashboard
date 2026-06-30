from pydantic import BaseModel, Field

from app.schemas.polymarket import OrderbookSummaryResponse


class LiveMicrostructureMetricsResponse(BaseModel):
    microprice: float
    depth_skew: float = Field(alias="depthSkew")
    realized_volatility: float = Field(alias="realizedVolatility")
    trade_intensity: float = Field(alias="tradeIntensity")
    order_flow_imbalance: float = Field(alias="orderFlowImbalance")

    model_config = {"populate_by_name": True}


class LiveMetricSampleResponse(BaseModel):
    timestamp: str
    mid_price: float = Field(alias="midPrice")
    spread_bps: float = Field(alias="spreadBps")
    microprice: float
    depth_skew: float = Field(alias="depthSkew")
    realized_volatility: float = Field(alias="realizedVolatility")
    trade_intensity: float = Field(alias="tradeIntensity")
    order_flow_imbalance: float = Field(alias="orderFlowImbalance")

    model_config = {"populate_by_name": True}


class LiveStreamStatusResponse(BaseModel):
    enabled: bool
    state: str
    market_slug: str = Field(alias="marketSlug")
    market_id: str | None = Field(default=None, alias="marketId")
    token_id: str | None = Field(default=None, alias="tokenId")
    connected_at: str | None = Field(default=None, alias="connectedAt")
    last_message_at: str | None = Field(default=None, alias="lastMessageAt")
    last_event_type: str | None = Field(default=None, alias="lastEventType")
    message_count: int = Field(alias="messageCount")
    reconnect_count: int = Field(alias="reconnectCount")
    latency_ms: int | None = Field(default=None, alias="latencyMs")
    error: str | None = None

    model_config = {"populate_by_name": True}


class LiveMarketSnapshotResponse(BaseModel):
    status: LiveStreamStatusResponse
    orderbook_summary: OrderbookSummaryResponse | None = Field(default=None, alias="orderbookSummary")
    microstructure: LiveMicrostructureMetricsResponse | None = None

    model_config = {"populate_by_name": True}


class LiveReplayResponse(BaseModel):
    status: LiveStreamStatusResponse
    samples: list[LiveMetricSampleResponse]
    sample_count: int = Field(alias="sampleCount")

    model_config = {"populate_by_name": True}
