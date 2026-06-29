import unittest

from app.analytics.series import (
    calculate_correlation,
    calculate_divergence,
    calculate_event_window,
    calculate_lead_lag,
    calculate_rolling_correlation,
    calculate_volatility,
)
from app.schemas.analytics import EventWindowRequest, LeadLagRequest, NumericSeriesPoint


def make_point(index: int, value: float) -> NumericSeriesPoint:
    return NumericSeriesPoint(timestamp=f"2024-01-{index + 1:02d}T00:00:00.000Z", value=value)


class AnalyticsTestCase(unittest.TestCase):
    def test_lead_lag_detects_market_leading(self) -> None:
        market = [0.20, 0.65, 0.30, 0.78, 0.42]
        polling = [0.10, 0.20, 0.65, 0.30, 0.78]
        payload = LeadLagRequest(
            market=[make_point(index, value) for index, value in enumerate(market)],
            polling=[make_point(index, value) for index, value in enumerate(polling)],
            maxLagDays=2,
        )

        result = calculate_lead_lag(payload)
        self.assertEqual(result.lag_days, -1)
        self.assertGreater(result.score, 0.9)
        self.assertEqual(result.interpretation, "Market leads polls by 1 day")

    def test_divergence_metrics_are_reported_in_points(self) -> None:
        payload = LeadLagRequest(
            market=[make_point(0, 0.55), make_point(1, 0.60), make_point(2, 0.52)],
            polling=[make_point(0, 0.50), make_point(1, 0.54), make_point(2, 0.50)],
            maxLagDays=2,
        )

        result = calculate_divergence(payload)
        self.assertAlmostEqual(result.current_gap, 2.0, places=2)
        self.assertAlmostEqual(result.max_gap, 6.0, places=2)
        self.assertGreater(result.average_gap, 0)

    def test_rolling_correlation_uses_requested_window(self) -> None:
        payload = LeadLagRequest(
            market=[make_point(index, value) for index, value in enumerate([0.1, 0.2, 0.3, 0.4, 0.5])],
            polling=[make_point(index, value) for index, value in enumerate([0.1, 0.2, 0.3, 0.4, 0.5])],
            maxLagDays=2,
        )

        result = calculate_rolling_correlation(payload, window_size=3)
        self.assertEqual(result.window_size, 3)
        self.assertAlmostEqual(result.coefficient, 1.0, places=3)
        self.assertEqual(len(result.points), 3)
        self.assertEqual(result.points[0].timestamp, "2024-01-03")
        self.assertAlmostEqual(result.points[-1].coefficient, 1.0, places=3)

    def test_analytics_align_on_shared_dates_instead_of_position(self) -> None:
        payload = LeadLagRequest(
            market=[
                NumericSeriesPoint(timestamp="2024-01-01T00:00:00.000Z", value=0.10),
                NumericSeriesPoint(timestamp="2024-01-02T00:00:00.000Z", value=0.20),
                NumericSeriesPoint(timestamp="2024-01-03T00:00:00.000Z", value=0.30),
            ],
            polling=[
                NumericSeriesPoint(timestamp="2024-01-02T00:00:00.000Z", value=0.20),
                NumericSeriesPoint(timestamp="2024-01-03T00:00:00.000Z", value=0.30),
                NumericSeriesPoint(timestamp="2024-01-04T00:00:00.000Z", value=0.40),
            ],
            maxLagDays=1,
        )

        correlation = calculate_correlation(payload)
        divergence = calculate_divergence(payload)

        self.assertAlmostEqual(correlation.coefficient, 1.0, places=3)
        self.assertAlmostEqual(divergence.current_gap, 0.0, places=3)

    def test_event_window_computes_pre_and_post_changes(self) -> None:
        payload = EventWindowRequest(
            series=[make_point(index, value) for index, value in enumerate([0.40, 0.42, 0.50, 0.47, 0.45])],
            anchorIndex=2,
            preWindow=2,
            postWindow=2,
        )

        result = calculate_event_window(payload)
        self.assertEqual(result.anchor_index, 2)
        self.assertEqual(result.anchor_timestamp, "2024-01-03T00:00:00.000Z")
        self.assertAlmostEqual(result.pre_change, 10.0, places=2)
        self.assertAlmostEqual(result.post_change, -5.0, places=2)
        self.assertAlmostEqual(result.net_move, 5.0, places=2)

    def test_volatility_and_correlation_return_stable_shapes(self) -> None:
        payload = LeadLagRequest(
            market=[make_point(index, value) for index, value in enumerate([0.4, 0.5, 0.45, 0.47])],
            polling=[make_point(index, value) for index, value in enumerate([0.39, 0.49, 0.44, 0.46])],
            maxLagDays=2,
        )

        correlation = calculate_correlation(payload)
        volatility = calculate_volatility([point.value for point in payload.market])

        self.assertIn(correlation.strength, {"weak", "moderate", "strong"})
        self.assertGreaterEqual(volatility.realized_volatility, 0.0)


if __name__ == "__main__":
    unittest.main()
