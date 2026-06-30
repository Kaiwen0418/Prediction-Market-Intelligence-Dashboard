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


@dataclass
class ManagedMarketStream:
    requested_slug: str
    resolved_slug: str | None = None
    market_id: str | None = None
    token_id: str | None = None
    connected_at: str | None = None
    last_message_at: str | None = None
    last_event_type: str | None = None
    message_count: int = 0
    reconnect_count: int = 0
    error: str | None = None
    state: str = "idle"
    task: asyncio.Task[None] | None = None
    book: LiveOrderbookState | None = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def build_status(self, enabled: bool) -> LiveStreamStatusResponse:
        latency_ms: int | None = None
        if self.last_message_at:
            try:
                last_message_dt = datetime.fromisoformat(self.last_message_at.replace("Z", "+00:00"))
                latency_ms = max(0, int((utc_now() - last_message_dt).total_seconds() * 1000))
            except ValueError:
                latency_ms = None

        return LiveStreamStatusResponse(
            enabled=enabled,
            state=self.state,
            marketSlug=self.resolved_slug or self.requested_slug,
            marketId=self.market_id,
            tokenId=self.token_id,
            connectedAt=self.connected_at,
            lastMessageAt=self.last_message_at,
            lastEventType=self.last_event_type,
            messageCount=self.message_count,
            reconnectCount=self.reconnect_count,
            latencyMs=latency_ms,
            error=self.error,
        )


class PolymarketLiveStreamManager:
    def __init__(self) -> None:
        self._registry: dict[str, ManagedMarketStream] = {}
        self._registry_lock = asyncio.Lock()
        self._stop_requested = False

    async def start(self) -> None:
        settings = get_settings()
        self._stop_requested = False
        if not settings.live_stream_enabled:
            return
        await self.ensure_stream(settings.featured_market_slug)

    async def stop(self) -> None:
        self._stop_requested = True
        async with self._registry_lock:
            streams = list(self._registry.values())
        for stream in streams:
            if stream.task:
                stream.task.cancel()
        for stream in streams:
            if stream.task:
                try:
                    await stream.task
                except asyncio.CancelledError:
                    pass
            stream.task = None
            stream.state = "stopped"

    async def ensure_stream(self, slug: str | None = None) -> ManagedMarketStream:
        settings = get_settings()
        requested_slug = (slug or settings.featured_market_slug).strip()
        if not requested_slug:
            raise RuntimeError("market slug is required")

        async with self._registry_lock:
            stream = self._registry.get(requested_slug)
            if stream is None:
                stream = ManagedMarketStream(requested_slug=requested_slug)
                self._registry[requested_slug] = stream
            if settings.live_stream_enabled and (stream.task is None or stream.task.done()):
                stream.task = asyncio.create_task(self._run_stream(stream), name=f"polymarket-live-stream:{requested_slug}")
            elif not settings.live_stream_enabled:
                stream.state = "disabled"
        return stream

    async def get_status(self, slug: str | None = None) -> LiveStreamStatusResponse:
        stream = await self.ensure_stream(slug)
        async with stream.lock:
            return stream.build_status(get_settings().live_stream_enabled)

    async def get_snapshot(self, slug: str | None = None) -> LiveMarketSnapshotResponse:
        stream = await self.ensure_stream(slug)
        async with stream.lock:
            status = stream.build_status(get_settings().live_stream_enabled)
            summary = stream.book.to_summary() if stream.book and (stream.book.bids or stream.book.asks or stream.book.trades) else None
            return LiveMarketSnapshotResponse(status=status, orderbookSummary=summary)

    async def _prepare_stream_market(self, stream: ManagedMarketStream) -> tuple[str, str, str]:
        featured_event = await fetch_featured_market(stream.requested_slug)
        market = normalize_featured_market_from_event(featured_event)
        if not market.token_id:
            raise RuntimeError("Featured market did not yield a token id for websocket subscription")

        async with stream.lock:
            stream.resolved_slug = market.slug
            stream.market_id = market.market_id
            stream.token_id = market.token_id
            stream.book = LiveOrderbookState(market_id=market.market_id, token_id=market.token_id)

        return market.slug, market.market_id, market.token_id

    async def _run_stream(self, stream: ManagedMarketStream) -> None:
        settings = get_settings()
        while not self._stop_requested:
            try:
                async with stream.lock:
                    stream.state = "preparing"

                resolved_slug, market_id, token_id = await self._prepare_stream_market(stream)

                async with stream.lock:
                    stream.resolved_slug = resolved_slug
                    stream.market_id = market_id
                    stream.token_id = token_id
                    stream.state = "connecting"

                async with websockets.connect(settings.polymarket_ws_url, ping_interval=20, ping_timeout=20) as socket:
                    subscription = {
                        "type": "market",
                        "assets_ids": [token_id],
                        "initial_dump": settings.live_stream_initial_dump,
                    }
                    await socket.send(json.dumps(subscription))

                    async with stream.lock:
                        stream.connected_at = iso_now()
                        stream.state = "connected"
                        stream.error = None

                    async for raw_message in socket:
                        if self._stop_requested:
                            break
                        await self._handle_message(stream, raw_message)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                async with stream.lock:
                    stream.state = "error"
                    stream.error = str(exc)
                    stream.reconnect_count += 1
                await asyncio.sleep(min(2 * max(stream.reconnect_count, 1), 15))

    async def _handle_message(self, stream: ManagedMarketStream, raw_message: str | bytes) -> None:
        try:
            payload = json.loads(raw_message if isinstance(raw_message, str) else raw_message.decode("utf-8"))
        except Exception:
            return

        events = payload if isinstance(payload, list) else [payload]
        async with stream.lock:
            for event in events:
                if not isinstance(event, dict):
                    continue
                if event.get("asset_id") and stream.token_id and str(event.get("asset_id")) != stream.token_id:
                    continue
                if stream.book:
                    stream.book.apply(event)
                stream.last_event_type = str(event.get("event_type", "")) or stream.last_event_type
                stream.last_message_at = str(event.get("timestamp") or iso_now())
                stream.message_count += 1


live_stream_manager = PolymarketLiveStreamManager()
