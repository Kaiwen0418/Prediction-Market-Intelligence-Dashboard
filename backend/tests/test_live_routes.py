import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.live import (
    LiveMarketSnapshotResponse,
    LiveMetricSampleResponse,
    LiveMicrostructureMetricsResponse,
    LiveReplayResponse,
    LiveStreamStatusResponse,
)
from app.schemas.polymarket import (
    LiquiditySummary,
    OrderbookSummaryResponse,
    TradePressureSummary,
)
from app.streaming.polymarket_ws import live_stream_manager


class LiveRoutesTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.original_start = live_stream_manager.start
        self.original_stop = live_stream_manager.stop
        self.original_get_status = live_stream_manager.get_status
        self.original_get_snapshot = live_stream_manager.get_snapshot
        self.original_get_replay = live_stream_manager.get_replay

        async def fake_start() -> None:
            return None

        async def fake_stop() -> None:
            return None

        async def fake_get_status(slug: str | None = None) -> LiveStreamStatusResponse:
            selected_slug = slug or "california-governor-election-2026"
            return LiveStreamStatusResponse(
                enabled=True,
                state="connected",
                marketSlug=selected_slug,
                marketId=f"{selected_slug}-market",
                tokenId=f"{selected_slug}-token",
                connectedAt="2026-06-30T10:00:00Z",
                lastMessageAt="2026-06-30T10:00:01Z",
                lastEventType="book",
                messageCount=12,
                reconnectCount=1,
                latencyMs=120,
                error=None,
            )

        async def fake_get_snapshot(slug: str | None = None) -> LiveMarketSnapshotResponse:
            selected_slug = slug or "california-governor-election-2026"
            return LiveMarketSnapshotResponse(
                status=await fake_get_status(selected_slug),
                orderbookSummary=OrderbookSummaryResponse(
                    marketId=f"{selected_slug}-market",
                    tokenId=f"{selected_slug}-token",
                    updatedAt="2026-06-30T10:00:01Z",
                    bestBid=0.48,
                    bestAsk=0.52,
                    midPrice=0.50,
                    spread=0.04,
                    bidLevels=14,
                    askLevels=13,
                    tradeCount=8,
                    liquidity=LiquiditySummary(
                        totalBidDepth=3000,
                        totalAskDepth=2800,
                        imbalance=0.034,
                        spreadBps=800,
                    ),
                    tradePressure=TradePressureSummary(
                        buyVolume=120,
                        sellVolume=80,
                        ratio=1.5,
                        pressure="buy",
                    ),
                ),
                microstructure=LiveMicrostructureMetricsResponse(
                    microprice=0.501,
                    depthSkew=0.034,
                    realizedVolatility=0.0182,
                    tradeIntensity=24.5,
                    orderFlowImbalance=0.20,
                ),
            )

        async def fake_get_replay(slug: str | None = None, limit: int = 60) -> LiveReplayResponse:
            selected_slug = slug or "california-governor-election-2026"
            samples = [
                LiveMetricSampleResponse(
                    timestamp="2026-06-30T10:00:00Z",
                    midPrice=0.49,
                    spreadBps=900,
                    microprice=0.491,
                    depthSkew=0.02,
                    realizedVolatility=0.01,
                    tradeIntensity=18.0,
                    orderFlowImbalance=0.12,
                ),
                LiveMetricSampleResponse(
                    timestamp="2026-06-30T10:00:01Z",
                    midPrice=0.50,
                    spreadBps=800,
                    microprice=0.501,
                    depthSkew=0.034,
                    realizedVolatility=0.0182,
                    tradeIntensity=24.5,
                    orderFlowImbalance=0.20,
                ),
            ][:limit]
            return LiveReplayResponse(
                status=await fake_get_status(selected_slug),
                samples=samples,
                sampleCount=len(samples),
            )

        live_stream_manager.start = fake_start
        live_stream_manager.stop = fake_stop
        live_stream_manager.get_status = fake_get_status
        live_stream_manager.get_snapshot = fake_get_snapshot
        live_stream_manager.get_replay = fake_get_replay

    def tearDown(self) -> None:
        live_stream_manager.start = self.original_start
        live_stream_manager.stop = self.original_stop
        live_stream_manager.get_status = self.original_get_status
        live_stream_manager.get_snapshot = self.original_get_snapshot
        live_stream_manager.get_replay = self.original_get_replay

    def test_status_route_returns_slug_scoped_payload(self) -> None:
        with TestClient(app) as client:
            response = client.get("/api/live/status", params={"slug": "texas-republican-senate-primary-winner"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["marketSlug"], "texas-republican-senate-primary-winner")
        self.assertEqual(payload["state"], "connected")
        self.assertEqual(payload["tokenId"], "texas-republican-senate-primary-winner-token")

    def test_market_snapshot_route_includes_microstructure(self) -> None:
        with TestClient(app) as client:
            response = client.get("/api/live/market-snapshot", params={"slug": "georgia-presidential-election-winner"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"]["marketSlug"], "georgia-presidential-election-winner")
        self.assertAlmostEqual(payload["orderbookSummary"]["midPrice"], 0.50, places=3)
        self.assertAlmostEqual(payload["microstructure"]["microprice"], 0.501, places=3)
        self.assertAlmostEqual(payload["microstructure"]["tradeIntensity"], 24.5, places=3)

    def test_replay_route_respects_limit(self) -> None:
        with TestClient(app) as client:
            response = client.get("/api/live/replay", params={"slug": "arizona", "limit": 1})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"]["marketSlug"], "arizona")
        self.assertEqual(payload["sampleCount"], 1)
        self.assertEqual(len(payload["samples"]), 1)
        self.assertIn("realizedVolatility", payload["samples"][0])


if __name__ == "__main__":
    unittest.main()
