import test from "node:test";
import assert from "node:assert/strict";
import {
  getMarketSignalColor,
  getMarketSignalLabel,
  getMarketSignalSeverity
} from "@/components/maps/marketSignals";

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
