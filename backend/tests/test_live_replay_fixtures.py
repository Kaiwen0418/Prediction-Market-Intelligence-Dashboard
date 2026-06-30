import unittest

from app.schemas.live import LiveStreamStatusResponse
from app.services.live_replay_fixtures import build_replay_fixture_response, build_replay_fixture_samples


class LiveReplayFixtureTestCase(unittest.TestCase):
    def test_fixture_samples_are_deterministic_and_bounded(self) -> None:
        first = build_replay_fixture_samples("california-governor-election-2026", limit=12)
        second = build_replay_fixture_samples("california-governor-election-2026", limit=12)

        self.assertEqual(len(first), 12)
        self.assertEqual(len(second), 12)
        self.assertEqual(first[0].timestamp, second[0].timestamp)
        self.assertEqual(first[-1].mid_price, second[-1].mid_price)
        self.assertNotEqual(first[0].mid_price, first[-1].mid_price)

    def test_fixture_response_marks_source(self) -> None:
        status = LiveStreamStatusResponse(
            enabled=True,
            state="warming",
            marketSlug="texas-republican-senate-primary-winner",
            marketId="market-1",
            tokenId="token-1",
            connectedAt=None,
            lastMessageAt=None,
            lastEventType=None,
            messageCount=0,
            reconnectCount=0,
            sampleCount=0,
            lastSampledAt=None,
            lastErrorAt=None,
            lastDisconnectReason=None,
            error=None,
        )

        response = build_replay_fixture_response(status, "texas-republican-senate-primary-winner", limit=8)

        self.assertEqual(response.source, "fixture")
        self.assertEqual(response.sample_count, 8)
        self.assertEqual(response.status.market_slug, "texas-republican-senate-primary-winner")


if __name__ == "__main__":
    unittest.main()
