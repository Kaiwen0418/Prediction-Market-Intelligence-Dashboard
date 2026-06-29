from fastapi import APIRouter, Query

from app.services.polymarket import (
    fetch_featured_market,
    fetch_orderbook,
    fetch_price_history,
    fetch_trades,
)

router = APIRouter(prefix="/api/polymarket", tags=["polymarket"])


@router.get("/featured-market")
async def get_featured_market(slug: str | None = Query(default=None)) -> dict | list:
    return await fetch_featured_market(slug)


@router.get("/orderbook")
async def get_orderbook(tokenId: str = Query(...)) -> dict | list:
    return await fetch_orderbook(tokenId)


@router.get("/price-history")
async def get_price_history(market: str = Query(...)) -> dict | list:
    return await fetch_price_history(market)


@router.get("/trades")
async def get_trades(tokenId: str = Query(...)) -> dict | list:
    return await fetch_trades(tokenId)
