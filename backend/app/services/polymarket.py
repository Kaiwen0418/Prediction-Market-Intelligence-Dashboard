import asyncio
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.schemas.polymarket import (
    LiquiditySummary,
    OrderbookLevel,
    OrderbookSummaryResponse,
    TradePressureSummary,
    TradePrint,
)


async def fetch_json(url: str) -> Any:
    settings = get_settings()
    timeout = httpx.Timeout(settings.request_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url, headers={"Accept": "application/json"})

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


async def fetch_featured_market(slug: str | None = None) -> Any:
    settings = get_settings()
    selected_slug = (slug or settings.featured_market_slug).strip()
    if not selected_slug:
        raise HTTPException(status_code=400, detail="slug is required")

    by_slug_url = f"{settings.gamma_base_url}/events/slug/{quote(selected_slug, safe='')}"
    try:
        return await fetch_json(by_slug_url)
    except HTTPException:
        fallback_url = f"{settings.gamma_base_url}/events?slug={quote(selected_slug, safe='')}"
        return await fetch_json(fallback_url)


async def fetch_orderbook(token_id: str) -> Any:
    settings = get_settings()
    if not token_id.strip():
        raise HTTPException(status_code=400, detail="tokenId is required")
    url = f"{settings.clob_base_url}/book?token_id={quote(token_id, safe='')}"
    return await fetch_json(url)


async def fetch_price_history(market: str) -> Any:
    settings = get_settings()
    if not market.strip():
        raise HTTPException(status_code=400, detail="market is required")
    url = f"{settings.clob_base_url}/prices-history?interval=all&market={quote(market, safe='')}&fidelity=720"
    return await fetch_json(url)


async def fetch_trades(token_id: str) -> Any:
    settings = get_settings()
    if not token_id.strip():
        raise HTTPException(status_code=400, detail="tokenId is required")
    url = f"{settings.gamma_base_url}/trades?limit=20&market={quote(token_id, safe='')}"
    return await fetch_json(url)


def _as_number(value: Any, fallback: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return fallback
    return fallback


def _as_string(value: Any, fallback: str = "") -> str:
    return value if isinstance(value, str) else fallback


def _normalize_levels(value: Any) -> list[OrderbookLevel]:
    if not isinstance(value, list):
        return []

    levels: list[OrderbookLevel] = []
    for row in value:
        if not isinstance(row, dict):
            continue
        price = _as_number(row.get("price"))
        size = _as_number(row.get("size"))
        if price > 0 and size > 0:
            levels.append(OrderbookLevel(price=price, size=size))
    return levels


def _normalize_trades(value: Any) -> list[TradePrint]:
    if not isinstance(value, list):
        return []

    trades: list[TradePrint] = []
    for index, row in enumerate(value):
        if not isinstance(row, dict):
            continue
        side = "sell" if _as_string(row.get("side")).lower() == "sell" else "buy"
        raw_timestamp = row.get("timestamp")
        if isinstance(raw_timestamp, (int, float)):
            timestamp = datetime.fromtimestamp(raw_timestamp, tz=timezone.utc).isoformat()
        else:
            timestamp = _as_string(raw_timestamp, datetime.now(timezone.utc).isoformat())
        price = _as_number(row.get("price"))
        size = _as_number(row.get("size"))
        if price <= 0 or size <= 0:
            continue
        trades.append(
            TradePrint(
                id=_as_string(row.get("id"), f"trade-{index}"),
                side=side,
                price=price,
                size=size,
                timestamp=timestamp,
            )
        )
    return trades


async def fetch_orderbook_summary(token_id: str) -> OrderbookSummaryResponse:
    if not token_id.strip():
        raise HTTPException(status_code=400, detail="tokenId is required")

    orderbook_payload, trades_payload = await asyncio.gather(
        fetch_orderbook(token_id),
        fetch_trades(token_id),
    )

    if not isinstance(orderbook_payload, dict):
        raise HTTPException(status_code=502, detail="Orderbook payload was not an object")

    bids = _normalize_levels(orderbook_payload.get("bids"))
    asks = _normalize_levels(orderbook_payload.get("asks"))
    trades = _normalize_trades(trades_payload)

    best_bid = bids[0].price if bids else 0.0
    best_ask = asks[0].price if asks else 0.0
    mid_price = (best_bid + best_ask) / 2 if best_bid and best_ask else best_bid or best_ask
    spread = best_ask - best_bid if best_bid and best_ask else 0.0

    total_bid_depth = sum(level.size for level in bids)
    total_ask_depth = sum(level.size for level in asks)
    imbalance_base = total_bid_depth + total_ask_depth
    imbalance = (total_bid_depth - total_ask_depth) / imbalance_base if imbalance_base else 0.0
    spread_bps = (spread / mid_price) * 10_000 if mid_price else 0.0

    buy_volume = sum(trade.size for trade in trades if trade.side == "buy")
    sell_volume = sum(trade.size for trade in trades if trade.side == "sell")
    ratio = buy_volume if sell_volume == 0 else buy_volume / sell_volume
    pressure = "buy" if ratio > 1.15 else "sell" if ratio < 0.87 else "balanced"

    return OrderbookSummaryResponse(
        marketId=_as_string(orderbook_payload.get("market"), token_id),
        tokenId=token_id,
        updatedAt=datetime.now(timezone.utc).isoformat(),
        bestBid=round(best_bid, 4),
        bestAsk=round(best_ask, 4),
        midPrice=round(mid_price, 4),
        spread=round(spread, 4),
        bidLevels=len(bids),
        askLevels=len(asks),
        tradeCount=len(trades),
        liquidity=LiquiditySummary(
            totalBidDepth=round(total_bid_depth, 4),
            totalAskDepth=round(total_ask_depth, 4),
            imbalance=round(imbalance, 3),
            spreadBps=round(spread_bps, 1),
        ),
        tradePressure=TradePressureSummary(
            buyVolume=round(buy_volume, 4),
            sellVolume=round(sell_volume, 4),
            ratio=round(ratio, 2),
            pressure=pressure,
        ),
    )
