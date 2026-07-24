import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRegionMarketTrades,
  getVisibleMarketTrades
} from "@/components/maps/MapLiveTradeTape";
import type { MarketTradePrint } from "@/types/market";

const trades = ["one", "two", "three", "four"].map(
  (marketSlug, index): MarketTradePrint => ({
    id: marketSlug,
    conditionId: `condition-${index}`,
    marketSlug,
    title: marketSlug,
    side: index % 2 ? "sell" : "buy",
    price: 0.5,
    size: 10,
    timestamp: `2026-07-24T10:00:0${index}Z`
  })
);

test("live trade tape rotates and wraps through the filtered feed", () => {
  assert.deepEqual(
    getVisibleMarketTrades(trades, 3).map((trade) => trade.marketSlug),
    ["four", "one", "two"]
  );
  assert.deepEqual(getVisibleMarketTrades([], 0), []);
});

test("live trade tape only includes configured regional market pairs", () => {
  const eventMatch = {
    ...trades[1],
    id: "event-match",
    eventSlug: "configured-event"
  };

  assert.deepEqual(
    filterRegionMarketTrades(
      [trades[0], eventMatch, trades[2]],
      ["one", "configured-event"]
    ).map((trade) => trade.id),
    ["one", "event-match"]
  );
});
