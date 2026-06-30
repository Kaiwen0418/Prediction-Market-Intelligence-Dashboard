from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Prediction Market API"
    app_env: str = "development"
    gamma_base_url: str = "https://gamma-api.polymarket.com"
    clob_base_url: str = "https://clob.polymarket.com"
    featured_market_slug: str = "california-governor-election-2026"
    polymarket_ws_url: str = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    live_stream_enabled: bool = True
    live_stream_initial_dump: bool = True
    live_stream_max_markets: int = 6
    live_stream_idle_ttl_seconds: int = 300
    live_stream_cleanup_interval_seconds: int = 60
    live_stream_metrics_history_limit: int = 240
    allow_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )
    request_timeout_seconds: float = 8.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
