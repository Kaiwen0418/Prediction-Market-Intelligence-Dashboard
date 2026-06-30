from fastapi import APIRouter

from app.schemas.live import LiveMarketSnapshotResponse, LiveStreamStatusResponse
from app.streaming.polymarket_ws import live_stream_manager

router = APIRouter(prefix="/api/live", tags=["live"])


@router.get("/status", response_model=LiveStreamStatusResponse)
async def get_live_status() -> LiveStreamStatusResponse:
    return await live_stream_manager.get_status()


@router.get("/market-snapshot", response_model=LiveMarketSnapshotResponse)
async def get_live_market_snapshot() -> LiveMarketSnapshotResponse:
    return await live_stream_manager.get_snapshot()
