import unittest

from app.services import polymarket as polymarket_service


class PolymarketSummaryTestCase(unittest.IsolatedAsyncioTestCase):
    def test_normalizes_documented_public_trade_wallet_shape(self) -> None:
        trades = polymarket_service._normalize_trades(
            [
                {
                    "proxyWallet": "0xAEBE4CFD8735F44BE2768380F1D9B0CFD6882C1D",
                    "side": "BUY",
                    "size": 23.98,
                    "price": 0.0436663887,
                    "timestamp": 1784892844,
                    "transactionHash": "0xtrade",
                },
                {
                    "proxyWallet": "not-an-address",
                    "side": "SELL",
                    "size": 5,
                    "price": 0.6,
                    "timestamp": 1784892844,
                    "transactionHash": "0xinvalid-wallet",
                },
            ]
        )

        self.assertEqual(len(trades), 2)
        self.assertEqual(
            trades[0].wallet_address,
            "0xaebe4cfd8735f44be2768380f1d9b0cfd6882c1d",
        )
        self.assertEqual(trades[0].id, "0xtrade")
        self.assertIsNone(trades[1].wallet_address)

    async def test_fetch_orderbook_summary_aggregates_depth_and_trade_pressure(self) -> None:
        async def fake_fetch_orderbook(token_id: str):
            self.assertEqual(token_id, "token-1")
            return {
                "market": "market-1",
                "bids": [
                    {"price": "0.49", "size": "150"},
                    {"price": "0.48", "size": "50"},
                ],
                "asks": [
                    {"price": "0.51", "size": "100"},
                    {"price": "0.52", "size": "80"},
                ],
            }

        async def fake_fetch_trades(condition_id: str):
            self.assertEqual(condition_id, "condition-1")
            return [
                {"id": "t1", "side": "buy", "price": "0.50", "size": "40", "timestamp": "2026-06-29T10:00:00Z"},
                {"id": "t2", "side": "sell", "price": "0.49", "size": "10", "timestamp": "2026-06-29T10:01:00Z"},
            ]

        original_fetch_orderbook = polymarket_service.fetch_orderbook
        original_fetch_trades = polymarket_service.fetch_trades
        polymarket_service.fetch_orderbook = fake_fetch_orderbook
        polymarket_service.fetch_trades = fake_fetch_trades
        try:
            result = await polymarket_service.fetch_orderbook_summary("token-1", "condition-1")
        finally:
            polymarket_service.fetch_orderbook = original_fetch_orderbook
            polymarket_service.fetch_trades = original_fetch_trades

        self.assertEqual(result.market_id, "market-1")
        self.assertEqual(result.best_bid, 0.49)
        self.assertEqual(result.best_ask, 0.51)
        self.assertEqual(result.trade_count, 2)
        self.assertAlmostEqual(result.liquidity.total_bid_depth, 200.0, places=3)
        self.assertAlmostEqual(result.liquidity.total_ask_depth, 180.0, places=3)
        self.assertAlmostEqual(result.liquidity.imbalance, 0.053, places=3)
        self.assertEqual(result.trade_pressure.pressure, "buy")
        self.assertAlmostEqual(result.trade_pressure.ratio, 4.0, places=2)
        self.assertEqual(result.whale_activity.status, "insufficient-data")
        self.assertEqual(result.whale_activity.sample_size, 2)
        self.assertEqual(result.whale_activity.historical_multiple_threshold, 3.0)
        self.assertFalse(result.whale_activity.attribution_available)

    async def test_trade_api_failure_preserves_orderbook_summary(self) -> None:
        async def fake_fetch_orderbook(_: str):
            return {
                "market": "market-1",
                "bids": [{"price": "0.49", "size": "150"}],
                "asks": [{"price": "0.51", "size": "100"}],
            }

        async def fail_fetch_trades(_: str):
            raise RuntimeError("data API unavailable")

        original_fetch_orderbook = polymarket_service.fetch_orderbook
        original_fetch_trades = polymarket_service.fetch_trades
        polymarket_service.fetch_orderbook = fake_fetch_orderbook
        polymarket_service.fetch_trades = fail_fetch_trades
        try:
            result = await polymarket_service.fetch_orderbook_summary("token-1", "condition-1")
        finally:
            polymarket_service.fetch_orderbook = original_fetch_orderbook
            polymarket_service.fetch_trades = original_fetch_trades

        self.assertEqual(result.best_bid, 0.49)
        self.assertEqual(result.trade_count, 0)
        self.assertEqual(result.whale_activity.wallet_concentration_status, "unavailable")


if __name__ == "__main__":
    unittest.main()
