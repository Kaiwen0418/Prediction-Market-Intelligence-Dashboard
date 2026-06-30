import asyncio
import json
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import websockets

from app.analytics.microstructure import calculate_liquidity_summary, calculate_trade_pressure_summary
from app.core.config import get_settings
from app.schemas.live import LiveMarketSnapshotResponse, LiveStreamStatusResponse
from app.schemas.polymarket import OrderbookSummaryResponse
from app.services.polymarket import fetch_featured_market, normalize_featured_market_from_event


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat()


def as_number(value: Any, fallback: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return fallback
    return fallback


@dataclass
class LiveOrderbookState:
    market_id: str
    token_id: str
    bids: list[tuple[float, float]] = field(default_factory=list)
    asks: list[tuple[float, float]] = field(default_factory=list)
    trades: deque[tuple[str, float]] = field(default_factory=lambda: deque(maxlen=50))
    updated_at: str = field(default_factory=iso_now)
    last_event_type: str | None = None
    tick_size: float = 0.01

    def apply(self, event: dict[str, Any]) -> None:
        event_type = str(event.get("event_type", ""))
        self.last_event_type = event_type or self.last_event_type
        self.updated_at = str(event.get("timestamp") or iso_now())

        if event_type == "book":
            self.bids = [
                (as_number(level.get("price")), as_number(level.get("size")))
                for level in event.get("bids", [])
                if isinstance(level, dict) and as_number(level.get("price")) > 0 and as_number(level.get("size")) > 0
            ]
            self.asks = [
                (as_number(level.get("price")), as_number(level.get("size")))
                for level in event.get("asks", [])
                if isinstance(level, dict) and as_number(level.get("price")) > 0 and as_number(level.get("size")) > 0
            ]
            return

        if event_type == "price_change":
            return

        if event_type == "best_bid_ask":
            best_bid = as_number(event.get("best_bid"))
            best_ask = as_number(event.get("best_ask"))
            if best_bid:
                bid_size = self.bids[0][1] if self.bids else 0.0
                if self.bids:
                    self.bids[0] = (best_bid, bid_size)
                else:
                    self.bids = [(best_bid, 0.0)]
            if best_ask:
                ask_size = self.asks[0][1] if self.asks else 0.0
                if self.asks:
                    self.asks[0] = (best_ask, ask_size)
                else:
                    self.asks = [(best_ask, 0.0)]
            return

        if event_type == "last_trade_price":
            price = as_number(event.get("price"))
            size = as_number(event.get("size"))
            if price > 0 and size > 0:
                side = "sell" if str(event.get("side", "")).lower() == "sell" else "buy"
                self.trades.appendleft((side, size))
            return

        if event_type == "tick_size_change":
            self.tick_size = as_number(event.get("new_tick_size"), self.tick_size)

    def to_summary(self) -> OrderbookSummaryResponse:
        best_bid = self.bids[0][0] if self.bids else 0.0
        best_ask = self.asks[0][0] if self.asks else 0.0
        mid_price = (best_bid + best_ask) / 2 if best_bid and best_ask else best_bid or best_ask
        spread = best_ask - best_bid if best_bid and best_ask else 0.0
        liquidity = calculate_liquidity_summary(self.bids, self.asks, spread, mid_price)
        trade_pressure = calculate_trade_pressure_summary(list(self.trades))
        return OrderbookSummaryResponse(
            marketId=self.market_id,
            tokenId=self.token_id,
            updatedAt=self.updated_at,
            bestBid=round(best_bid, 4),
            bestAsk=round(best_ask, 4),
            midPrice=round(mid_price, 4),
            spread=round(spread, 4),
            bidLevels=len(self.bids),
            askLevels=len(self.asks),
            tradeCount=len(self.trades),
            liquidity=liquidity,
            tradePressure=trade_pressure,
        )


class PolymarketLiveStreamManager:
    def __init__(self) -> None:
        self._task: asyncio.Task[None] | None = None
        self._lock = asyncio.Lock()
        self._stop_requested = False
        self._state = "idle"
        self._market_slug = get_settings().featured_market_slug
        self._market_id: str | None = None
        self._token_id: str | None = None
        self._connected_at: str | None = None
        self._last_message_at: str | None = None
        self._last_event_type: str | None = None
        self._message_count = 0
        self._reconnect_count = 0
        self._error: str | None = None
        self._book: LiveOrderbookState | None = None

    async def start(self) -> None:
        settings = get_settings()
        if not settings.live_stream_enabled:
            self._state = "disabled"
            return
        if self._task and not self._task.done():
            return
        self._stop_requested = False
        self._task = asyncio.create_task(self._run(), name="polymarket-live-stream")

    async def stop(self) -> None:
        self._stop_requested = True
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        self._state = "stopped"

    async def _prepare_market(self) -> tuple[str, str, str]:
        featured_event = await fetch_featured_market(self._market_slug)
        market = normalize_featured_market_from_event(featured_event)
        if not market.token_id:
            raise RuntimeError("Featured market did not yield a token id for websocket subscription")
        self._market_id = market.market_id
        self._token_id = market.token_id
        self._book = LiveOrderbookState(market_id=market.market_id, token_id=market.token_id)
        return market.slug, market.market_id, market.token_id

    async def _run(self) -> None:
        settings = get_settings()
        while not self._stop_requested:
            try:
                self._state = "preparing"
                slug, market_id, token_id = await self._prepare_market()
                self._market_slug = slug
                self._market_id = market_id
                self._token_id = token_id
                self._state = "connecting"

                async with websockets.connect(settings.polymarket_ws_url, ping_interval=20, ping_timeout=20) as socket:
                    subscription = {
                        "type": "market",
                        "assets_ids": [token_id],
                        "initial_dump": settings.live_stream_initial_dump,
                    }
                    await socket.send(json.dumps(subscription))
                    self._connected_at = iso_now()
                    self._state = "connected"
                    self._error = None

                    async for raw_message in socket:
                        if self._stop_requested:
                            break
                        await self._handle_message(raw_message)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._state = "error"
                self._error = str(exc)
                self._reconnect_count += 1
                await asyncio.sleep(min(2 * self._reconnect_count, 15))

    async def _handle_message(self, raw_message: str | bytes) -> None:
        try:
            payload = json.loads(raw_message if isinstance(raw_message, str) else raw_message.decode("utf-8"))
        except Exception:
            return

        events = payload if isinstance(payload, list) else [payload]
        async with self._lock:
            for event in events:
                if not isinstance(event, dict):
                    continue
                if event.get("asset_id") and self._token_id and str(event.get("asset_id")) != self._token_id:
                    continue
                if self._book:
                    self._book.apply(event)
                self._last_event_type = str(event.get("event_type", "")) or self._last_event_type
                self._last_message_at = str(event.get("timestamp") or iso_now())
                self._message_count += 1

    async def get_status(self) -> LiveStreamStatusResponse:
        async with self._lock:
            return self._build_status_unlocked()

    async def get_snapshot(self) -> LiveMarketSnapshotResponse:
        async with self._lock:
            status = self._build_status_unlocked()
            summary = self._book.to_summary() if self._book and (self._book.bids or self._book.asks or self._book.trades) else None
            return LiveMarketSnapshotResponse(
                status=status,
                orderbookSummary=summary,
            )

    def _build_status_unlocked(self) -> LiveStreamStatusResponse:
        latency_ms: int | None = None
        if self._last_message_at:
            try:
                last_message_dt = datetime.fromisoformat(self._last_message_at.replace("Z", "+00:00"))
                latency_ms = max(0, int((utc_now() - last_message_dt).total_seconds() * 1000))
            except ValueError:
                latency_ms = None

        return LiveStreamStatusResponse(
            enabled=get_settings().live_stream_enabled,
            state=self._state,
            marketSlug=self._market_slug,
            marketId=self._market_id,
            tokenId=self._token_id,
            connectedAt=self._connected_at,
            lastMessageAt=self._last_message_at,
            lastEventType=self._last_event_type,
            messageCount=self._message_count,
            reconnectCount=self._reconnect_count,
            latencyMs=latency_ms,
            error=self._error,
        )


live_stream_manager = PolymarketLiveStreamManager()
