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
    sample_count: int = Field(default=0, alias="sampleCount")
    last_sampled_at: str | None = Field(default=None, alias="lastSampledAt")
    last_error_at: str | None = Field(default=None, alias="lastErrorAt")
    last_disconnect_reason: str | None = Field(default=None, alias="lastDisconnectReason")
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
    source: str = "stream"

    model_config = {"populate_by_name": True}


class LiveRegistryHealthResponse(BaseModel):
    enabled: bool
    state: str
    featured_slug: str = Field(alias="featuredSlug")
    registry_size: int = Field(alias="registrySize")
    connected_streams: int = Field(alias="connectedStreams")
    error_streams: int = Field(alias="errorStreams")
    stale_streams: int = Field(alias="staleStreams")
    disabled_streams: int = Field(alias="disabledStreams")
    max_markets: int = Field(alias="maxMarkets")
    idle_ttl_seconds: int = Field(alias="idleTtlSeconds")
    streams: list[LiveStreamStatusResponse]

    model_config = {"populate_by_name": True}


class LiveReadinessCheckResponse(BaseModel):
    name: str
    state: str
    detail: str


class LiveReadinessResponse(BaseModel):
    ready: bool
    state: str
    featured_slug: str = Field(alias="featuredSlug")
    checks: list[LiveReadinessCheckResponse]

    model_config = {"populate_by_name": True}


class LiveDegradationIssueResponse(BaseModel):
    code: str
    severity: str
    summary: str
    stream_slug: str | None = Field(default=None, alias="streamSlug")
    detail: str | None = None

    model_config = {"populate_by_name": True}


class LiveDegradationResponse(BaseModel):
    state: str
    issue_count: int = Field(alias="issueCount")
    issues: list[LiveDegradationIssueResponse]

    model_config = {"populate_by_name": True}
