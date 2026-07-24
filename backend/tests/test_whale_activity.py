import unittest

from app.analytics.whale_activity import analyze_whale_activity
from app.schemas.polymarket import TradePrint


def trade(trade_id: str, side: str, size: float, price: float = 0.5) -> TradePrint:
    return TradePrint(
        id=trade_id,
        side=side,
        price=price,
        size=size,
        timestamp="2026-07-24T10:00:00Z",
    )


class WhaleActivityTestCase(unittest.TestCase):
    def test_requires_a_minimum_normalized_trade_sample(self) -> None:
        result = analyze_whale_activity(
            [trade("1", "buy", 10), trade("2", "sell", 20)],
            total_bid_depth=1_000,
            total_ask_depth=1_000,
        )

        self.assertEqual(result.status, "insufficient-data")
        self.assertEqual(result.sample_size, 2)
        self.assertEqual(result.detections, ())

    def test_flags_trade_only_when_size_and_depth_thresholds_are_met(self) -> None:
        result = analyze_whale_activity(
            [
                trade("1", "buy", 10),
                trade("2", "sell", 10),
                trade("3", "buy", 12),
                trade("4", "sell", 8),
                trade("large-buy", "buy", 60, price=0.55),
            ],
            total_bid_depth=2_000,
            total_ask_depth=1_000,
        )

        self.assertEqual(result.status, "detected")
        self.assertEqual(len(result.detections), 1)
        detection = result.detections[0]
        self.assertEqual(detection.trade_id, "large-buy")
        self.assertEqual(detection.historical_size_multiple, 6.0)
        self.assertEqual(detection.executable_depth_share, 0.06)
        self.assertEqual(detection.notional_usd, 33.0)

    def test_rejects_trade_that_only_meets_one_relative_threshold(self) -> None:
        result = analyze_whale_activity(
            [
                trade("1", "buy", 10),
                trade("2", "sell", 10),
                trade("3", "buy", 10),
                trade("4", "sell", 10),
                trade("large-history-only", "buy", 40),
            ],
            total_bid_depth=1_000,
            total_ask_depth=10_000,
        )

        self.assertEqual(result.status, "clear")
        self.assertEqual(result.detections, ())


if __name__ == "__main__":
    unittest.main()
