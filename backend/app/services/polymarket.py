import asyncio
import json
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.schemas.polymarket import (
    FeaturedMarketResponse,
    LiquiditySummary,
    MarketContextResponse,
    OrderbookLevel,
    OrderbookSummaryResponse,
    PriceHistoryMetaResponse,
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


def _parse_json_array(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


def _first_string(values: list[Any]) -> str | None:
    for value in values:
        if isinstance(value, str) and value:
            return value
    return None


def _normalize_featured_market_from_event(payload: Any) -> FeaturedMarketResponse:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="Featured market payload was not an object")

    markets = payload.get("markets")
    if not isinstance(markets, list) or not markets:
        raise HTTPException(status_code=502, detail="Featured event did not include markets")

    candidates: list[FeaturedMarketResponse] = []
    for market in markets:
        if not isinstance(market, dict):
            continue
        token_ids = _parse_json_array(market.get("clobTokenIds"))
        outcomes = _parse_json_array(market.get("outcomes"))
        outcome_prices = _parse_json_array(market.get("outcomePrices"))
        token_id = _first_string([token_ids[0] if token_ids else None, market.get("clobTokenId"), market.get("conditionId")])
        if not token_id:
            continue
        contract_label = _as_string(market.get("question"), _as_string(market.get("title"), ""))
        outcome_label = _first_string([outcomes[0] if outcomes else None, contract_label, "Yes"])
        probability = _as_number(outcome_prices[0] if outcome_prices else None, _as_number(market.get("lastTradePrice"), 0.5))
        candidates.append(
            FeaturedMarketResponse(
                marketId=_as_string(market.get("id"), _as_string(market.get("conditionId"), token_id)),
                eventId=_as_string(payload.get("id")) or None,
                tokenId=token_id,
                slug=_as_string(payload.get("slug"), token_id),
                eventSlug=_as_string(payload.get("slug"), token_id),
                title=_as_string(payload.get("title"), _as_string(payload.get("slug"), token_id)),
                category=_as_string(payload.get("category"), _as_string(market.get("category"), "Politics")),
                probability=probability,
                volume24h=_as_number(market.get("volume24hr"), _as_number(payload.get("volume24hr"))),
                openInterest=_as_number(market.get("openInterest"), _as_number(payload.get("openInterest"))),
                liquidity=_as_number(market.get("liquidity"), _as_number(payload.get("liquidity"))),
                image=_as_string(payload.get("image")) or None,
                description=_as_string(payload.get("description")) or None,
                outcomeLabel=outcome_label,
                contractLabel=contract_label or None,
                updatedAt=datetime.now(timezone.utc).isoformat(),
            )
        )

    if not candidates:
        raise HTTPException(status_code=502, detail="Featured event did not yield a usable token")

    return sorted(candidates, key=lambda candidate: candidate.probability, reverse=True)[0]


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


async def fetch_market_context(slug: str | None = None) -> MarketContextResponse:
    featured_event = await fetch_featured_market(slug)
    featured_market = _normalize_featured_market_from_event(featured_event)

    orderbook_summary = (
        await fetch_orderbook_summary(featured_market.token_id)
        if featured_market.token_id
        else None
    )

    price_history_payload = await fetch_price_history(featured_market.token_id or featured_market.market_id)
    history_rows = (
        price_history_payload
        if isinstance(price_history_payload, list)
        else price_history_payload.get("history", [])
        if isinstance(price_history_payload, dict)
        else []
    )

    start_timestamp: str | None = None
    end_timestamp: str | None = None
    normalized_points = 0
    if isinstance(history_rows, list):
        normalized_timestamps: list[str] = []
        for row in history_rows:
            if not isinstance(row, dict):
                continue
            timestamp_value = row.get("t", row.get("timestamp"))
            if isinstance(timestamp_value, (int, float)):
                normalized_timestamps.append(datetime.fromtimestamp(timestamp_value, tz=timezone.utc).isoformat())
            elif isinstance(timestamp_value, str) and timestamp_value:
                normalized_timestamps.append(timestamp_value)
        normalized_points = len(normalized_timestamps)
        if normalized_timestamps:
            start_timestamp = normalized_timestamps[0]
            end_timestamp = normalized_timestamps[-1]

    return MarketContextResponse(
        featuredMarket=featured_market,
        orderbookSummary=orderbook_summary,
        priceHistoryMeta=PriceHistoryMetaResponse(
            market=featured_market.token_id or featured_market.market_id,
            points=normalized_points,
            startTimestamp=start_timestamp,
            endTimestamp=end_timestamp,
        ),
    )
