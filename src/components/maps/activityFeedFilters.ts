import type { MarketSignalKind } from "@/types/signals";

export type ActivitySignalFilter = "all" | MarketSignalKind;
export type ActivityTimeWindow = 0 | 1 | 6 | 24;
export type MapViewMode = "world" | "country";

export type ActivityFeedFilterState = {
  mapView: MapViewMode;
  countryCode: string;
  regionCode: string | null;
  minimumScore: number;
  signalKind: ActivitySignalFilter;
  maxAgeHours: ActivityTimeWindow;
};

export const DEFAULT_ACTIVITY_FILTERS: ActivityFeedFilterState = {
  mapView: "country",
  countryCode: "US",
  regionCode: null,
  minimumScore: 50,
  signalKind: "all",
  maxAgeHours: 0
};

const SIGNAL_FILTERS = new Set<ActivitySignalFilter>([
  "all",
  "whale-flow",
  "order-flow",
  "volume-anomaly",
  "price-move",
  "poll-divergence",
  "normal"
]);
const SCORE_THRESHOLDS = new Set([0, 50, 70, 85]);
const TIME_WINDOWS = new Set<ActivityTimeWindow>([0, 1, 6, 24]);

export function parseActivityFeedFilters(
  input: string | URLSearchParams
): ActivityFeedFilterState {
  const params = typeof input === "string" ? new URLSearchParams(input) : input;
  const mapView = params.get("view") === "world" ? "world" : DEFAULT_ACTIVITY_FILTERS.mapView;
  const countryCode = params.get("country")?.trim().toUpperCase() || DEFAULT_ACTIVITY_FILTERS.countryCode;
  const rawRegionCode = params.get("region")?.trim().toUpperCase() || null;
  const scoreParam = params.get("score");
  const rawScore = scoreParam === null ? Number.NaN : Number(scoreParam);
  const rawSignal = params.get("signal") as ActivitySignalFilter | null;
  const windowParam = params.get("window");
  const rawWindow = (windowParam === null ? Number.NaN : Number(windowParam)) as ActivityTimeWindow;

  return {
    mapView,
    countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : DEFAULT_ACTIVITY_FILTERS.countryCode,
    regionCode: rawRegionCode && /^[A-Z0-9]{2,3}$/.test(rawRegionCode) ? rawRegionCode : null,
    minimumScore: SCORE_THRESHOLDS.has(rawScore) ? rawScore : DEFAULT_ACTIVITY_FILTERS.minimumScore,
    signalKind: rawSignal && SIGNAL_FILTERS.has(rawSignal) ? rawSignal : DEFAULT_ACTIVITY_FILTERS.signalKind,
    maxAgeHours: TIME_WINDOWS.has(rawWindow) ? rawWindow : DEFAULT_ACTIVITY_FILTERS.maxAgeHours
  };
}

export function serializeActivityFeedFilters(
  filters: ActivityFeedFilterState,
  existing: string | URLSearchParams = ""
) {
  const params = typeof existing === "string" ? new URLSearchParams(existing) : new URLSearchParams(existing);

  const setOrDelete = (key: string, value: string | null, defaultValue: string | null) => {
    if (value === defaultValue || value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  };

  setOrDelete("view", filters.mapView, DEFAULT_ACTIVITY_FILTERS.mapView);
  setOrDelete("country", filters.countryCode, DEFAULT_ACTIVITY_FILTERS.countryCode);
  setOrDelete("region", filters.regionCode, DEFAULT_ACTIVITY_FILTERS.regionCode);
  setOrDelete("score", String(filters.minimumScore), String(DEFAULT_ACTIVITY_FILTERS.minimumScore));
  setOrDelete("signal", filters.signalKind, DEFAULT_ACTIVITY_FILTERS.signalKind);
  setOrDelete("window", String(filters.maxAgeHours), String(DEFAULT_ACTIVITY_FILTERS.maxAgeHours));

  return params;
}
