import assert from "node:assert/strict";
import test from "node:test";
import {
  createMarketSeries,
  createOrderbookSnapshot,
  getMockMarketBySlug
} from "@/services/polymarket/mockData";

const ukMarketSlugs = [
  "will-scotland-hold-an-independence-referendum-before-2030",
  "next-london-mayoral-election-winner",
  "welsh-parliament-election-most-seats",
  "northern-ireland-assembly-election-most-seats"
] as const;

test("UK market fallbacks preserve each selected market identity", () => {
  for (const slug of ukMarketSlugs) {
    const market = getMockMarketBySlug(slug);

    assert.equal(market.slug, slug);
    assert.equal(market.eventSlug, slug);
    assert.ok(market.outcomeLabel);
    assert.ok(market.tokenId);
  }
});

test("UK market fallback supplies coherent history and order book values", () => {
  const market = getMockMarketBySlug(ukMarketSlugs[0]);
  const history = createMarketSeries(market);
  const orderbook = createOrderbookSnapshot(market);

  assert.equal(history.length, 30);
  assert.equal(orderbook.marketId, market.marketId);
  assert.equal(orderbook.tokenId, market.tokenId);
  assert.ok(Math.abs(orderbook.midPrice - market.probability) <= 0.011);
  assert.ok(Math.abs((history.at(-1)?.value ?? 0) - market.probability) <= 0.03);
});
