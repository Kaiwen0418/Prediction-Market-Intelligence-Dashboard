from pydantic import BaseModel, Field

from app.schemas.polymarket import OrderbookSummaryResponse


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

    model_config = {"populate_by_name": True}
