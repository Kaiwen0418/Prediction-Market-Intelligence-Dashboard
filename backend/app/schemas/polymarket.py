from typing import Any

from pydantic import BaseModel, Field


class MarketProxyResponse(BaseModel):
    payload: dict[str, Any] | list[Any]


class FeaturedMarketResponse(BaseModel):
    market_id: str = Field(alias="marketId")
    event_id: str | None = Field(default=None, alias="eventId")
    token_id: str | None = Field(default=None, alias="tokenId")
    slug: str
    event_slug: str | None = Field(default=None, alias="eventSlug")
    title: str
    category: str
    probability: float
    volume24h: float
    open_interest: float = Field(alias="openInterest")
    liquidity: float | None = None
    image: str | None = None
    description: str | None = None
    outcome_label: str | None = Field(default=None, alias="outcomeLabel")
    contract_label: str | None = Field(default=None, alias="contractLabel")
    updated_at: str = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


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


class LiquiditySummary(BaseModel):
    total_bid_depth: float = Field(alias="totalBidDepth")
    total_ask_depth: float = Field(alias="totalAskDepth")
    imbalance: float
    spread_bps: float = Field(alias="spreadBps")

    model_config = {"populate_by_name": True}


class TradePressureSummary(BaseModel):
    buy_volume: float = Field(alias="buyVolume")
    sell_volume: float = Field(alias="sellVolume")
    ratio: float
    pressure: str

    model_config = {"populate_by_name": True}


class OrderbookSummaryResponse(BaseModel):
    market_id: str = Field(alias="marketId")
    token_id: str = Field(alias="tokenId")
    updated_at: str = Field(alias="updatedAt")
    best_bid: float = Field(alias="bestBid")
    best_ask: float = Field(alias="bestAsk")
    mid_price: float = Field(alias="midPrice")
    spread: float
    bid_levels: int = Field(alias="bidLevels")
    ask_levels: int = Field(alias="askLevels")
    trade_count: int = Field(alias="tradeCount")
    liquidity: LiquiditySummary
    trade_pressure: TradePressureSummary = Field(alias="tradePressure")

    model_config = {"populate_by_name": True}


class PriceHistoryMetaResponse(BaseModel):
    market: str
    points: int
    start_timestamp: str | None = Field(default=None, alias="startTimestamp")
    end_timestamp: str | None = Field(default=None, alias="endTimestamp")

    model_config = {"populate_by_name": True}


class MarketContextResponse(BaseModel):
    featured_market: FeaturedMarketResponse = Field(alias="featuredMarket")
    orderbook_summary: OrderbookSummaryResponse | None = Field(default=None, alias="orderbookSummary")
    price_history_meta: PriceHistoryMetaResponse = Field(alias="priceHistoryMeta")

    model_config = {"populate_by_name": True}
