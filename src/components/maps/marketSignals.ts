import type {
  MarketSignalSeverity,
  RegionMarketSignal,
  RegionSignal
} from "@/types/signals";

export type {
  MarketSignalKind,
  MarketSignalSeverity,
  MarketSignalSource,
  RegionMarketSignal,
  RegionSignal,
  RegionSignalComponent,
  RegionSignalsResponse
} from "@/types/signals";

export const SIGNAL_LEGEND: Array<{
  severity: Exclude<MarketSignalSeverity, "inactive">;
  label: string;
}> = [
  { severity: "normal", label: "Normal" },
  { severity: "elevated", label: "Elevated" },
  { severity: "high", label: "High" },
  { severity: "critical", label: "Critical" }
];

const SIGNAL_COLORS: Record<MarketSignalSeverity, string> = {
  inactive: "#e5e7eb",
  normal: "#8ea9c7",
  elevated: "#d5a65a",
  high: "#d77b57",
  critical: "#b84f5f"
};

export function getMarketSignalSeverity(score?: number | null): MarketSignalSeverity {
  if (score === undefined || score === null) {
    return "inactive";
  }

  const boundedScore = Math.max(0, Math.min(100, score));

  if (boundedScore >= 85) {
    return "critical";
  }

  if (boundedScore >= 70) {
    return "high";
  }

  if (boundedScore >= 50) {
    return "elevated";
  }

  return "normal";
}

export function getMarketSignalColor(score?: number | null) {
  return SIGNAL_COLORS[getMarketSignalSeverity(score)];
}

export function getMarketSignalLabel(signal?: RegionMarketSignal | null) {
  if (!signal) {
    return "No active signal";
  }

  return signal.kind
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type RankedRegionSignal<T> = {
  region: T;
  signal: RegionMarketSignal;
  priority: number;
};

export function rankRegionSignals<T extends { code: string; signal: RegionMarketSignal }>(
  regions: T[],
  overrides: RegionSignal[],
  minimumScore = 0,
  now = new Date()
): Array<RankedRegionSignal<T>> {
  const overrideByRegion = new Map(overrides.map((signal) => [signal.regionCode, signal]));
  const nowMs = now.getTime();

  return regions
    .map((region) => {
      const signal = overrideByRegion.get(region.code) ?? region.signal;
      const observedAtMs = Date.parse(signal.observedAt);
      const ageHours = Number.isFinite(observedAtMs) ? Math.max(0, nowMs - observedAtMs) / 3_600_000 : 24;
      const freshnessBoost = signal.source === "live" ? Math.max(0, 5 - ageHours) : 0;
      const confidenceBoost = signal.source === "live" ? (signal.confidence ?? 0) * 5 : 0;

      return {
        region,
        signal,
        priority: signal.score + freshnessBoost + confidenceBoost
      };
    })
    .filter((item) => item.signal.score >= minimumScore)
    .sort((left, right) => right.priority - left.priority || right.signal.score - left.signal.score);
}
