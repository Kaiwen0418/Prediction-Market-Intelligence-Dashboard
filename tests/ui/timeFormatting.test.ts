import assert from "node:assert/strict";
import test from "node:test";
import { formatTimestamp } from "../../src/utils/time";

test("formats millisecond epoch strings returned by the live replay API", () => {
  const epochMilliseconds = 1_784_756_881_799;

  assert.equal(
    formatTimestamp(String(epochMilliseconds), "yyyy-MM-dd HH:mm:ss"),
    formatTimestamp(epochMilliseconds, "yyyy-MM-dd HH:mm:ss")
  );
});

test("formats second epoch strings without treating them as milliseconds", () => {
  const epochSeconds = 1_784_756_881;

  assert.equal(
    formatTimestamp(String(epochSeconds), "yyyy-MM-dd HH:mm:ss"),
    formatTimestamp(epochSeconds * 1000, "yyyy-MM-dd HH:mm:ss")
  );
});
