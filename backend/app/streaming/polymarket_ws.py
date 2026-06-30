import asyncio
import json
import logging
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import websockets

from app.analytics.microstructure import (
    calculate_liquidity_summary,
    calculate_live_microstructure_metrics,
    calculate_trade_pressure_summary,
)
from app.core.config import get_settings
from app.schemas.live import (
    LiveDegradationIssueResponse,
    LiveDegradationResponse,
    LiveRegistryHealthResponse,
    LiveMarketSnapshotResponse,
    LiveMetricSampleResponse,
    LiveReplayResponse,
    LiveReadinessCheckResponse,
    LiveReadinessResponse,
    LiveStreamStatusResponse,
)
from app.schemas.polymarket import OrderbookSummaryResponse
from app.services.polymarket import fetch_featured_market, normalize_featured_market_from_event

logger = logging.getLogger("app.live_stream")


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
    mid_prices: deque[float] = field(default_factory=lambda: deque(maxlen=120))
    samples: deque[LiveMetricSampleResponse] = field(
        default_factory=lambda: deque(maxlen=max(get_settings().live_stream_metrics_history_limit, 20))
    )
    updated_at: str = field(default_factory=iso_now)
    last_event_type: str | None = None
    tick_size: float = 0.01

    def _record_mid_price(self) -> None:
        best_bid = self.bids[0][0] if self.bids else 0.0
        best_ask = self.asks[0][0] if self.asks else 0.0
        mid_price = (best_bid + best_ask) / 2 if best_bid and best_ask else best_bid or best_ask
        if mid_price > 0:
            self.mid_prices.append(mid_price)

    def _record_sample(self) -> None:
        summary = self.to_summary()
        microstructure = self.to_microstructure()
        self.samples.append(
            LiveMetricSampleResponse(
                timestamp=self.updated_at,
                midPrice=summary.mid_price,
                spreadBps=summary.liquidity.spread_bps,
                microprice=microstructure.microprice,
                depthSkew=microstructure.depth_skew,
                realizedVolatility=microstructure.realized_volatility,
                tradeIntensity=microstructure.trade_intensity,
                orderFlowImbalance=microstructure.order_flow_imbalance,
            )
        )

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
            self._record_mid_price()
            self._record_sample()
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
            self._record_mid_price()
            self._record_sample()
            return

        if event_type == "last_trade_price":
            price = as_number(event.get("price"))
            size = as_number(event.get("size"))
            if price > 0 and size > 0:
                side = "sell" if str(event.get("side", "")).lower() == "sell" else "buy"
                self.trades.appendleft((side, size))
                if self.bids or self.asks:
                    self._record_sample()
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

    def to_microstructure(self):
        return calculate_live_microstructure_metrics(
            self.bids,
            self.asks,
            list(self.trades),
            list(self.mid_prices),
        )

    def to_replay_samples(self, limit: int) -> list[LiveMetricSampleResponse]:
        bounded_limit = max(limit, 1)
        return list(self.samples)[-bounded_limit:]


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
    last_error_at: str | None = None
    last_disconnect_reason: str | None = None
    state: str = "idle"
    task: asyncio.Task[None] | None = None
    last_accessed_at: str = field(default_factory=iso_now)
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
            sampleCount=len(self.book.samples) if self.book else 0,
            lastSampledAt=self.book.samples[-1].timestamp if self.book and self.book.samples else None,
            lastErrorAt=self.last_error_at,
            lastDisconnectReason=self.last_disconnect_reason,
            error=self.error,
        )


class PolymarketLiveStreamManager:
    def __init__(self) -> None:
        self._registry: dict[str, ManagedMarketStream] = {}
        self._registry_lock = asyncio.Lock()
        self._stop_requested = False
        self._cleanup_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        settings = get_settings()
        self._stop_requested = False
        if not settings.live_stream_enabled:
            return
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._run_cleanup_loop(), name="polymarket-live-stream-cleanup")
        await self.ensure_stream(settings.featured_market_slug)
        self._log_event("manager_started", featured_slug=settings.featured_market_slug)

    async def stop(self) -> None:
        self._stop_requested = True
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        self._cleanup_task = None
        async with self._registry_lock:
            streams = list(self._registry.values())
            self._registry.clear()
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
        self._log_event("manager_stopped", cleared_streams=len(streams))

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
                self._log_event("stream_registered", requested_slug=requested_slug, registry_size=len(self._registry))
            stream.last_accessed_at = iso_now()
            if settings.live_stream_enabled and (stream.task is None or stream.task.done()):
                stream.task = asyncio.create_task(self._run_stream(stream), name=f"polymarket-live-stream:{requested_slug}")
                self._log_event("stream_task_started", requested_slug=requested_slug)
            elif not settings.live_stream_enabled:
                stream.state = "disabled"
            await self._trim_registry_unlocked()
        return stream

    async def get_status(self, slug: str | None = None) -> LiveStreamStatusResponse:
        stream = await self.ensure_stream(slug)
        async with stream.lock:
            stream.last_accessed_at = iso_now()
            return stream.build_status(get_settings().live_stream_enabled)

    async def get_snapshot(self, slug: str | None = None) -> LiveMarketSnapshotResponse:
        stream = await self.ensure_stream(slug)
        async with stream.lock:
            stream.last_accessed_at = iso_now()
            status = stream.build_status(get_settings().live_stream_enabled)
            summary = stream.book.to_summary() if stream.book and (stream.book.bids or stream.book.asks or stream.book.trades) else None
            microstructure = stream.book.to_microstructure() if stream.book and (stream.book.bids or stream.book.asks) else None
            return LiveMarketSnapshotResponse(status=status, orderbookSummary=summary, microstructure=microstructure)

    async def get_replay(self, slug: str | None = None, limit: int = 60) -> LiveReplayResponse:
        stream = await self.ensure_stream(slug)
        async with stream.lock:
            stream.last_accessed_at = iso_now()
            status = stream.build_status(get_settings().live_stream_enabled)
            samples = stream.book.to_replay_samples(limit) if stream.book else []
            return LiveReplayResponse(
                status=status,
                samples=samples,
                sampleCount=len(samples),
            )

    async def get_registry_health(self) -> LiveRegistryHealthResponse:
        settings = get_settings()
        async with self._registry_lock:
            streams = list(self._registry.values())

        statuses: list[LiveStreamStatusResponse] = []
        connected_streams = 0
        error_streams = 0
        stale_streams = 0
        disabled_streams = 0

        for stream in streams:
            async with stream.lock:
                status = stream.build_status(settings.live_stream_enabled)
                statuses.append(status)
                if status.state == "connected":
                    connected_streams += 1
                if status.state == "error":
                    error_streams += 1
                if status.state == "disabled":
                    disabled_streams += 1
                if self._is_stream_stale(stream, settings.live_stream_idle_ttl_seconds):
                    stale_streams += 1

        if not settings.live_stream_enabled:
            state = "disabled"
        elif error_streams and connected_streams == 0:
            state = "degraded"
        elif stale_streams or error_streams:
            state = "warning"
        elif connected_streams:
            state = "healthy"
        else:
            state = "starting"

        return LiveRegistryHealthResponse(
            enabled=settings.live_stream_enabled,
            state=state,
            featuredSlug=settings.featured_market_slug,
            registrySize=len(streams),
            connectedStreams=connected_streams,
            errorStreams=error_streams,
            staleStreams=stale_streams,
            disabledStreams=disabled_streams,
            maxMarkets=settings.live_stream_max_markets,
            idleTtlSeconds=settings.live_stream_idle_ttl_seconds,
            streams=statuses,
        )

    async def get_readiness(self) -> LiveReadinessResponse:
        settings = get_settings()
        health = await self.get_registry_health()
        featured_status = next((status for status in health.streams if status.market_slug == health.featured_slug), None)
        checks: list[LiveReadinessCheckResponse] = []

        if not settings.live_stream_enabled:
            checks.append(
                LiveReadinessCheckResponse(
                    name="manager",
                    state="disabled",
                    detail="Live stream manager is disabled by configuration.",
                )
            )
            return LiveReadinessResponse(
                ready=False,
                state="disabled",
                featuredSlug=health.featured_slug,
                checks=checks,
            )

        checks.append(
            LiveReadinessCheckResponse(
                name="registry",
                state="ready" if health.registry_size > 0 else "starting",
                detail=f"Registry has {health.registry_size} tracked stream(s); {health.connected_streams} connected.",
            )
        )

        if featured_status is None:
            checks.append(
                LiveReadinessCheckResponse(
                    name="featured-stream",
                    state="starting",
                    detail=f"Featured slug {health.featured_slug} is not registered yet.",
                )
            )
            return LiveReadinessResponse(
                ready=False,
                state="starting",
                featuredSlug=health.featured_slug,
                checks=checks,
            )

        featured_stream_state = "ready" if featured_status.state == "connected" else featured_status.state
        checks.append(
            LiveReadinessCheckResponse(
                name="featured-stream",
                state=featured_stream_state,
                detail=(
                    f"Featured stream state={featured_status.state}, messages={featured_status.message_count}, "
                    f"reconnects={featured_status.reconnect_count}."
                ),
            )
        )

        sample_ready = featured_status.sample_count > 0
        checks.append(
            LiveReadinessCheckResponse(
                name="sampling",
                state="ready" if sample_ready else "warming",
                detail=(
                    f"Replay sample count={featured_status.sample_count}, last sample="
                    f"{featured_status.last_sampled_at or 'none'}."
                ),
            )
        )

        latency_ready = featured_status.latency_ms is None or featured_status.latency_ms <= 60_000
        checks.append(
            LiveReadinessCheckResponse(
                name="freshness",
                state="ready" if latency_ready else "stale",
                detail=(
                    f"Last message={featured_status.last_message_at or 'none'}, latency="
                    f"{featured_status.latency_ms if featured_status.latency_ms is not None else 'unknown'}ms."
                ),
            )
        )

        ready = featured_status.state == "connected" and sample_ready and latency_ready
        if ready:
            state = "ready"
        elif featured_status.state == "error":
            state = "degraded"
        else:
            state = "warming"

        return LiveReadinessResponse(
            ready=ready,
            state=state,
            featuredSlug=health.featured_slug,
            checks=checks,
        )

    async def get_degradation_summary(self) -> LiveDegradationResponse:
        settings = get_settings()
        health = await self.get_registry_health()
        issues: list[LiveDegradationIssueResponse] = []

        if not settings.live_stream_enabled:
            issues.append(
                LiveDegradationIssueResponse(
                    code="stream_manager_disabled",
                    severity="warning",
                    summary="Live stream manager is disabled, so market rail data cannot warm up.",
                    detail="Set LIVE_STREAM_ENABLED=true to enable backend-owned stream ingestion.",
                )
            )

        for status in health.streams:
            if status.state == "error":
                issues.append(
                    LiveDegradationIssueResponse(
                        code="stream_error",
                        severity="critical",
                        streamSlug=status.market_slug,
                        summary=f"Stream {status.market_slug} is in error state.",
                        detail=status.error or status.last_disconnect_reason or "Unknown stream failure.",
                    )
                )
                continue

            if status.state == "connected" and status.sample_count == 0:
                issues.append(
                    LiveDegradationIssueResponse(
                        code="sampling_not_ready",
                        severity="warning",
                        streamSlug=status.market_slug,
                        summary=f"Stream {status.market_slug} has not produced replay samples yet.",
                        detail="The connection is open but the backend replay window is still warming up.",
                    )
                )

            if status.latency_ms is not None and status.latency_ms > 60_000:
                issues.append(
                    LiveDegradationIssueResponse(
                        code="stream_stale",
                        severity="warning",
                        streamSlug=status.market_slug,
                        summary=f"Stream {status.market_slug} is stale.",
                        detail=f"Last message latency is {status.latency_ms}ms.",
                    )
                )

        if not issues:
            state = "healthy"
        elif any(issue.severity == "critical" for issue in issues):
            state = "degraded"
        else:
            state = "warning"

        return LiveDegradationResponse(
            state=state,
            issueCount=len(issues),
            issues=issues,
        )

    async def _run_cleanup_loop(self) -> None:
        settings = get_settings()
        while not self._stop_requested:
            try:
                await asyncio.sleep(max(settings.live_stream_cleanup_interval_seconds, 5))
                async with self._registry_lock:
                    stale_slugs = [
                        slug
                        for slug, stream in self._registry.items()
                        if self._is_stream_stale(stream, settings.live_stream_idle_ttl_seconds)
                    ]

                for slug in stale_slugs:
                    await self._remove_stream(slug)
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(5)

    async def _trim_registry_unlocked(self) -> None:
        settings = get_settings()
        limit = max(settings.live_stream_max_markets, 1)
        if len(self._registry) <= limit:
            return

        ranked = sorted(
            self._registry.items(),
            key=lambda item: self._parse_iso_or_min(item[1].last_accessed_at),
        )
        excess = len(self._registry) - limit
        evictable_slugs = [slug for slug, _ in ranked[:excess]]
        for slug in evictable_slugs:
            asyncio.create_task(self._remove_stream(slug), name=f"polymarket-live-stream-evict:{slug}")
            self._log_event("stream_eviction_scheduled", requested_slug=slug, registry_size=len(self._registry), limit=limit)

    async def _remove_stream(self, slug: str) -> None:
        async with self._registry_lock:
            stream = self._registry.pop(slug, None)
        if stream is None:
            return
        if stream.task:
            stream.task.cancel()
            try:
                await stream.task
            except asyncio.CancelledError:
                pass
        stream.task = None
        stream.state = "stopped"
        self._log_event("stream_removed", requested_slug=slug, reason=stream.last_disconnect_reason or "cleanup")

    def _is_stream_stale(self, stream: ManagedMarketStream, ttl_seconds: int) -> bool:
        ttl_seconds = max(ttl_seconds, 30)
        last_accessed = self._parse_iso_or_min(stream.last_accessed_at)
        cutoff = utc_now() - timedelta(seconds=ttl_seconds)
        featured_slug = get_settings().featured_market_slug.strip()
        return stream.requested_slug != featured_slug and last_accessed < cutoff

    def _parse_iso_or_min(self, value: str | None) -> datetime:
        if not value:
            return datetime.min.replace(tzinfo=timezone.utc)
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)

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
            stream.last_disconnect_reason = None

        return market.slug, market.market_id, market.token_id

    async def _run_stream(self, stream: ManagedMarketStream) -> None:
        settings = get_settings()
        while not self._stop_requested:
            try:
                async with stream.lock:
                    stream.state = "preparing"
                self._log_event("stream_preparing", requested_slug=stream.requested_slug)

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
                        stream.last_disconnect_reason = None
                    self._log_event(
                        "stream_connected",
                        requested_slug=stream.requested_slug,
                        resolved_slug=resolved_slug,
                        market_id=market_id,
                        token_id=token_id,
                    )

                    async for raw_message in socket:
                        if self._stop_requested:
                            async with stream.lock:
                                stream.last_disconnect_reason = "manager_stop_requested"
                            break
                        await self._handle_message(stream, raw_message)
            except asyncio.CancelledError:
                async with stream.lock:
                    stream.last_disconnect_reason = "task_cancelled"
                raise
            except Exception as exc:
                async with stream.lock:
                    stream.state = "error"
                    stream.error = str(exc)
                    stream.last_error_at = iso_now()
                    stream.last_disconnect_reason = str(exc)
                    stream.reconnect_count += 1
                self._log_event(
                    "stream_error",
                    requested_slug=stream.requested_slug,
                    reconnect_count=stream.reconnect_count,
                    error=str(exc),
                )
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
                if stream.message_count in {1, 10, 100} or stream.message_count % 500 == 0:
                    self._log_event(
                        "stream_progress",
                        requested_slug=stream.requested_slug,
                        message_count=stream.message_count,
                        last_event_type=stream.last_event_type,
                    )

    def _log_event(self, event: str, **payload: Any) -> None:
        message = {"event": event, "component": "polymarket_live_stream", **payload}
        logger.info(json.dumps(message, sort_keys=True))


live_stream_manager = PolymarketLiveStreamManager()
