import test from "node:test";
import assert from "node:assert/strict";
import {
  getMarketSignalColor,
  getMarketSignalLabel,
  getMarketSignalSeverity,
  rankRegionSignals
} from "@/components/maps/marketSignals";
import type { RegionSignal } from "@/types/signals";
import {
  getCountryMarketMaps,
  getRegionMarketsByCountry,
  getRegionMarketPairLabel,
  marketMatchesRegion,
  type RegionMarket
} from "@/components/maps/spotlightStates";

const REGION_MARKET_FIXTURE: RegionMarket = {
  code: "TX",
  countryCode: "US",
  countryLabel: "United States",
  center: [-99.3, 31.1],
  featureId: "48",
  label: "Texas",
  liveMarketSlug: "texas-republican-senate-primary-winner",
  note: "Test",
  zoom: 3.2,
  status: "live",
  signal: {
    kind: "whale-flow",
    score: 92,
    headline: "Whale",
    detail: "Whale",
    observedAt: "2026-07-24T09:30:00Z",
    source: "fixture"
  }
};

test("signal scores map to stable severity thresholds", () => {
  assert.equal(getMarketSignalSeverity(null), "inactive");
  assert.equal(getMarketSignalSeverity(0), "normal");
  assert.equal(getMarketSignalSeverity(49), "normal");
  assert.equal(getMarketSignalSeverity(50), "elevated");
  assert.equal(getMarketSignalSeverity(70), "high");
  assert.equal(getMarketSignalSeverity(85), "critical");
  assert.equal(getMarketSignalSeverity(200), "critical");
});

test("signal colors distinguish inactive and abnormal activity", () => {
  assert.notEqual(getMarketSignalColor(null), getMarketSignalColor(50));
  assert.notEqual(getMarketSignalColor(50), getMarketSignalColor(85));
});

test("signal labels are readable", () => {
  assert.equal(
    getMarketSignalLabel({
      kind: "whale-flow",
      score: 90,
      headline: "Whale flow",
      detail: "Test detail",
      observedAt: "2026-07-24T09:40:00Z",
      source: "fixture"
    }),
    "Whale Flow"
  );
  assert.equal(getMarketSignalLabel(null), "No active signal");
});

test("activity ranking applies backend overrides and minimum score", () => {
  const regions = [
    {
      code: "TX",
      signal: {
        kind: "whale-flow" as const,
        score: 92,
        headline: "Fixture Texas",
        detail: "Fixture",
        observedAt: "2026-07-24T08:00:00Z",
        source: "fixture" as const
      }
    },
    {
      code: "CA",
      signal: {
        kind: "volume-anomaly" as const,
        score: 79,
        headline: "Fixture California",
        detail: "Fixture",
        observedAt: "2026-07-24T08:00:00Z",
        source: "fixture" as const
      }
    }
  ];
  const overrides: RegionSignal[] = [
    {
      regionCode: "CA",
      countryCode: "US",
      marketSlug: "california",
      kind: "order-flow",
      score: 95,
      severity: "critical",
      headline: "Live California",
      detail: "Live",
      observedAt: "2026-07-24T09:59:00Z",
      source: "live",
      confidence: 0.75,
      baselineWindow: "24 samples",
      components: []
    }
  ];

  const ranked = rankRegionSignals(regions, overrides, {
    minimumScore: 85,
    now: new Date("2026-07-24T10:00:00Z")
  });

  assert.deepEqual(ranked.map((item) => item.region.code), ["CA", "TX"]);
  assert.equal(ranked[0]?.signal.headline, "Live California");
});

test("activity ranking excludes regions below the selected threshold", () => {
  const ranked = rankRegionSignals(
    [
      {
        code: "AZ",
        signal: {
          kind: "normal" as const,
          score: 49,
          headline: "Normal",
          detail: "Normal",
          observedAt: "2026-07-24T08:00:00Z",
          source: "fixture" as const
        }
      }
    ],
    [],
    {
      minimumScore: 50,
      now: new Date("2026-07-24T10:00:00Z")
    }
  );

  assert.equal(ranked.length, 0);
});

test("activity ranking filters by signal kind and freshness window", () => {
  const regions = [
    {
      code: "TX",
      signal: {
        kind: "whale-flow" as const,
        score: 92,
        headline: "Whale",
        detail: "Whale",
        observedAt: "2026-07-24T09:30:00Z",
        source: "fixture" as const
      }
    },
    {
      code: "PA",
      signal: {
        kind: "poll-divergence" as const,
        score: 72,
        headline: "Poll",
        detail: "Poll",
        observedAt: "2026-07-24T07:00:00Z",
        source: "fixture" as const
      }
    }
  ];

  const ranked = rankRegionSignals(regions, [], {
    signalKind: "whale-flow",
    maxAgeHours: 1,
    now: new Date("2026-07-24T10:00:00Z")
  });

  assert.deepEqual(ranked.map((item) => item.region.code), ["TX"]);
});

test("region pair labels remain readable during market fallback", () => {
  assert.equal(
    getRegionMarketPairLabel(REGION_MARKET_FIXTURE),
    "Texas Republican Senate Primary Winner"
  );
});

test("region coverage only matches the configured market identity", () => {
  assert.equal(
    marketMatchesRegion(REGION_MARKET_FIXTURE, {
      slug: "texas-republican-senate-primary-winner"
    }),
    true
  );
  assert.equal(
    marketMatchesRegion(REGION_MARKET_FIXTURE, {
      slug: "outcome-token",
      eventSlug: "texas-republican-senate-primary-winner"
    }),
    true
  );
  assert.equal(
    marketMatchesRegion(REGION_MARKET_FIXTURE, {
      slug: "california-governor-election-2026"
    }),
    false
  );
});

test("country adapters expose distinct configured region identifiers", () => {
  assert.deepEqual(
    getCountryMarketMaps().map((country) => country.code),
    ["US", "GB", "EU"]
  );

  const ukRegions = getRegionMarketsByCountry("GB");
  assert.deepEqual(
    ukRegions.map((region) => region.code),
    ["SCT", "LDN", "WLS", "NIR"]
  );
  assert.equal(new Set(ukRegions.map((region) => region.featureId)).size, ukRegions.length);

  const europeRegions = getRegionMarketsByCountry("EU");
  assert.deepEqual(
    europeRegions.map((region) => region.code),
    ["FR", "DE", "ES", "IT", "IS"]
  );
  assert.equal(
    new Set(europeRegions.map((region) => region.featureId)).size,
    europeRegions.length
  );
  assert.ok(europeRegions.every((region) => region.marketStatus === "open"));
});
