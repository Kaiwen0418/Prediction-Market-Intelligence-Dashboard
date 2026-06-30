import asyncio
import json

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from app.schemas.live import LiveMarketSnapshotResponse, LiveRegistryHealthResponse, LiveReplayResponse, LiveStreamStatusResponse
from app.streaming.polymarket_ws import live_stream_manager

router = APIRouter(prefix="/api/live", tags=["live"])


@router.get("/status", response_model=LiveStreamStatusResponse)
async def get_live_status(slug: str | None = Query(default=None)) -> LiveStreamStatusResponse:
    return await live_stream_manager.get_status(slug)


@router.get("/registry-health", response_model=LiveRegistryHealthResponse)
async def get_live_registry_health() -> LiveRegistryHealthResponse:
    return await live_stream_manager.get_registry_health()


@router.get("/market-snapshot", response_model=LiveMarketSnapshotResponse)
async def get_live_market_snapshot(slug: str | None = Query(default=None)) -> LiveMarketSnapshotResponse:
    return await live_stream_manager.get_snapshot(slug)


@router.get("/replay", response_model=LiveReplayResponse)
async def get_live_replay(
    slug: str | None = Query(default=None),
    limit: int = Query(default=60, ge=1, le=500),
) -> LiveReplayResponse:
    return await live_stream_manager.get_replay(slug, limit)


@router.get("/stream")
async def stream_live_market(request: Request, slug: str | None = Query(default=None)) -> StreamingResponse:
    async def event_generator():
        await live_stream_manager.ensure_stream(slug)
        while True:
            if await request.is_disconnected():
                break

            snapshot = await live_stream_manager.get_snapshot(slug)
            payload = snapshot.model_dump(by_alias=True)
            yield f"event: snapshot\ndata: {json.dumps(payload)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
