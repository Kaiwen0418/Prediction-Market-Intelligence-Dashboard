from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_analytics import router as analytics_router
from app.api.routes_live import router as live_router
from app.api.routes_polymarket import router as polymarket_router
from app.api.routes_research import router as research_router
from app.core.config import get_settings
from app.streaming.polymarket_ws import live_stream_manager

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await live_stream_manager.start()
    try:
        yield
    finally:
        await live_stream_manager.stop()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="FastAPI + NumPy backend for market ingestion and analytics.",
    lifespan=lifespan,
)

allow_all_origins = "*" in settings.allow_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else settings.allow_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(polymarket_router)
app.include_router(analytics_router)
app.include_router(research_router)
app.include_router(live_router)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}
