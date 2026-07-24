import assert from "node:assert/strict";
import test from "node:test";
import { getVisibleMarketTrades } from "@/components/maps/MapLiveTradeTape";
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

test("live trade tape rotates and wraps through the global feed", () => {
  assert.deepEqual(
    getVisibleMarketTrades(trades, 3).map((trade) => trade.marketSlug),
    ["four", "one", "two"]
  );
  assert.deepEqual(getVisibleMarketTrades([], 0), []);
});
