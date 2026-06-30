import asyncio
import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.schemas.live import LiveMarketSnapshotResponse, LiveStreamStatusResponse
from app.streaming.polymarket_ws import live_stream_manager

router = APIRouter(prefix="/api/live", tags=["live"])


@router.get("/status", response_model=LiveStreamStatusResponse)
async def get_live_status() -> LiveStreamStatusResponse:
    return await live_stream_manager.get_status()


@router.get("/market-snapshot", response_model=LiveMarketSnapshotResponse)
async def get_live_market_snapshot() -> LiveMarketSnapshotResponse:
    return await live_stream_manager.get_snapshot()


@router.get("/stream")
async def stream_live_market(request: Request) -> StreamingResponse:
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break

            snapshot = await live_stream_manager.get_snapshot()
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
