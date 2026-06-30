import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBackendHealthDetail,
  buildBackendHealthLine,
  buildSourceDotTitle,
  getReplaySourceLabel,
  getSourceDotColorClass
} from "@/components/maps/liveRailDiagnostics";

test("backend health line reports readiness, registry occupancy, and issue count", () => {
  const line = buildBackendHealthLine(
    {
      ready: false,
      state: "warming",
      featuredSlug: "california-governor-election-2026",
      checks: [{ name: "sampling", state: "warming", detail: "Replay sample count=0." }]
    },
    {
      state: "warning",
      issueCount: 2,
      issues: [{ code: "sampling_not_ready", severity: "warning", summary: "Replay window is warming up." }]
    },
    {
      enabled: true,
      state: "warning",
      featuredSlug: "california-governor-election-2026",
      registrySize: 3,
      connectedStreams: 1,
      errorStreams: 0,
      staleStreams: 0,
      disabledStreams: 0,
      maxMarkets: 6,
      idleTtlSeconds: 300,
      streams: []
    }
  );

  assert.equal(line, "Backend warming · 1/3 connected · 2 issues");
});

test("backend health detail prefers degradation summary over readiness detail", () => {
  const detail = buildBackendHealthDetail(
    {
      ready: false,
      state: "warming",
      featuredSlug: "california-governor-election-2026",
      checks: [{ name: "sampling", state: "warming", detail: "Replay sample count=0." }]
    },
    {
      state: "warning",
      issueCount: 1,
      issues: [{ code: "sampling_not_ready", severity: "warning", summary: "Replay window is warming up." }]
    }
  );

  assert.equal(detail, "Replay window is warming up.");
});

test("replay source label distinguishes fixture from stream", () => {
  assert.equal(
    getReplaySourceLabel({
      status: {
        enabled: true,
        state: "warming",
        marketSlug: "slug",
        messageCount: 0,
        reconnectCount: 0
      },
      samples: [],
      sampleCount: 24,
      source: "fixture"
    }),
    "24 samples · fixture"
  );

  assert.equal(getReplaySourceLabel(null), "pending");
});

test("source dot colors remain stable across live fallback failed pending", () => {
  assert.equal(getSourceDotColorClass("live"), "bg-emerald-500");
  assert.equal(getSourceDotColorClass("fallback"), "bg-amber-400");
  assert.equal(getSourceDotColorClass("failed"), "bg-rose-500");
  assert.equal(getSourceDotColorClass("pending"), "bg-slate-300");
});

test("source dot title includes state, mode, checked time, and first issue", () => {
  const title = buildSourceDotTitle("replay", {
    sourceKey: "live-replay",
    state: "live",
    mode: "curated",
    checkedAt: "2 minutes ago",
    issues: [{ stage: "payload", message: "Fixture replay is in use" }]
  });

  assert.equal(title, "replay: live · curated · 2 minutes ago · Fixture replay is in use");
});
