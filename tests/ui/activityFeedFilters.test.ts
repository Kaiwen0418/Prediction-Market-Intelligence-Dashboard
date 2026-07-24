import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ACTIVITY_FILTERS,
  parseActivityFeedFilters,
  serializeActivityFeedFilters
} from "@/components/maps/activityFeedFilters";

test("activity filters parse a valid shareable query", () => {
  const filters = parseActivityFeedFilters(
    "?region=tx&score=85&signal=whale-flow&window=6"
  );

  assert.deepEqual(filters, {
    countryCode: "US",
    regionCode: "TX",
    minimumScore: 85,
    signalKind: "whale-flow",
    maxAgeHours: 6
  });
});

test("activity filters keep defaults when query parameters are absent", () => {
  assert.deepEqual(parseActivityFeedFilters(""), DEFAULT_ACTIVITY_FILTERS);
});

test("activity filters reject unsupported values", () => {
  const filters = parseActivityFeedFilters(
    "?country=invalid&region=toolong&score=42&signal=unknown&window=3"
  );

  assert.deepEqual(filters, DEFAULT_ACTIVITY_FILTERS);
});

test("activity filter serialization preserves unrelated query values", () => {
  const params = serializeActivityFeedFilters(
    {
      countryCode: "US",
      regionCode: "PA",
      minimumScore: 70,
      signalKind: "poll-divergence",
      maxAgeHours: 24
    },
    "?campaign=general"
  );

  assert.equal(
    params.toString(),
    "campaign=general&region=PA&score=70&signal=poll-divergence&window=24"
  );
});
