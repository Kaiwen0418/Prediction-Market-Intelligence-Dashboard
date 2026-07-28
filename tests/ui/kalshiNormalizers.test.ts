import assert from "node:assert/strict";
import test from "node:test";
import { normalizeKalshiEvents } from "@/services/kalshi/normalizers";

test("Kalshi events normalize the leading contract and aggregate event volume", () => {
  const markets = normalizeKalshiEvents({
    events: [
      {
        event_ticker: "KXGOVCA-26",
        series_ticker: "KXGOVCA",
        title: "California Governor winner? (Person)",
        category: "Elections",
        settlement_sources: [
          {
            name: "California Secretary of State",
            url: "https://www.sos.ca.gov/elections"
          }
        ],
        markets: [
          {
            ticker: "KXGOVCA-26-XBEC",
            status: "active",
            yes_sub_title: "Xavier Becerra",
            last_price_dollars: "0.8500",
            volume_24h_fp: "125.50",
            liquidity_dollars: "500.00",
            expected_expiration_time: "2027-11-03T16:00:00Z",
            updated_time: "2026-07-28T09:00:00Z"
          },
          {
            ticker: "KXGOVCA-26-SHIL",
            status: "active",
            yes_sub_title: "Steve Hilton",
            last_price_dollars: "0.0900",
            volume_24h_fp: "74.50",
            liquidity_dollars: "250.00",
            updated_time: "2026-07-28T09:01:00Z"
          }
        ]
      }
    ]
  });

  assert.equal(markets.length, 1);
  assert.equal(markets[0]?.eventTicker, "KXGOVCA-26");
  assert.equal(markets[0]?.outcomeLabel, "Xavier Becerra");
  assert.equal(markets[0]?.probability, 0.85);
  assert.equal(markets[0]?.volume24h, 200);
  assert.equal(markets[0]?.liquidity, 750);
  assert.equal(markets[0]?.status, "open");
  assert.equal(
    markets[0]?.url,
    "https://kalshi.com/markets/kxgovca/kxgovca-26"
  );
  assert.equal(
    markets[0]?.resolutionSource,
    "https://www.sos.ca.gov/elections"
  );
});

test("Kalshi normalization rejects malformed events and unsafe source URLs", () => {
  const markets = normalizeKalshiEvents({
    events: [
      { event_ticker: "MISSING-MARKETS" },
      {
        event_ticker: "SENATETX-26",
        series_ticker: "SENATETX",
        title: "Texas Senate winner?",
        settlement_sources: [{ url: "javascript:alert(1)" }],
        markets: [
          {
            status: "finalized",
            yes_sub_title: "Republican party",
            last_price_dollars: "0.64"
          }
        ]
      }
    ]
  });

  assert.equal(markets.length, 1);
  assert.equal(markets[0]?.status, "closed");
  assert.equal(markets[0]?.resolutionSource, undefined);
});
