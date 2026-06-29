from typing import Any

from pydantic import BaseModel, Field


class MarketProxyResponse(BaseModel):
    payload: dict[str, Any] | list[Any]


class PricePoint(BaseModel):
    timestamp: str
    value: float


class OrderbookLevel(BaseModel):
    price: float
    size: float


class TradePrint(BaseModel):
    id: str
    side: str
    price: float
    size: float
    timestamp: str


class OrderbookSnapshot(BaseModel):
    market_id: str = Field(alias="marketId")
    token_id: str | None = Field(default=None, alias="tokenId")
    bids: list[OrderbookLevel]
    asks: list[OrderbookLevel]
    trades: list[TradePrint] = Field(default_factory=list)
    spread: float
    mid_price: float = Field(alias="midPrice")
    tick_size: float | None = Field(default=None, alias="tickSize")
    source: str = "live"
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}
