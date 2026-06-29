from typing import Any
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import get_settings


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
