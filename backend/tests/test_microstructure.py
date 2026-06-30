import unittest

from app.analytics.microstructure import (
    calculate_liquidity_summary,
    calculate_trade_pressure_summary,
)


class MicrostructureAnalyticsTestCase(unittest.TestCase):
    def test_calculate_liquidity_summary(self) -> None:
        summary = calculate_liquidity_summary(
            bids=[(0.49, 120.0), (0.48, 80.0)],
            asks=[(0.51, 100.0), (0.52, 60.0)],
            spread=0.02,
            mid_price=0.50,
        )

        self.assertAlmostEqual(summary.total_bid_depth, 200.0, places=3)
        self.assertAlmostEqual(summary.total_ask_depth, 160.0, places=3)
        self.assertAlmostEqual(summary.imbalance, 0.111, places=3)
        self.assertAlmostEqual(summary.spread_bps, 400.0, places=1)

    def test_calculate_trade_pressure_summary(self) -> None:
        summary = calculate_trade_pressure_summary(
            [("buy", 40.0), ("buy", 20.0), ("sell", 10.0)]
        )

        self.assertAlmostEqual(summary.buy_volume, 60.0, places=3)
        self.assertAlmostEqual(summary.sell_volume, 10.0, places=3)
        self.assertAlmostEqual(summary.ratio, 6.0, places=2)
        self.assertEqual(summary.pressure, "buy")


if __name__ == "__main__":
    unittest.main()
