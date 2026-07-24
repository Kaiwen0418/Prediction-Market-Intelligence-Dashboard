"use client";

import { useMemo } from "react";
import {
  getMarketSignalColor,
  getMarketSignalLabel,
  rankRegionSignals
} from "@/components/maps/marketSignals";
import type {
  ActivitySignalFilter,
  ActivityTimeWindow
} from "@/components/maps/activityFeedFilters";
import type { RegionMarket } from "@/components/maps/spotlightStates";
import type { RegionSignal } from "@/types/signals";
import { relativeTime } from "@/utils/time";
import { filterWatchedRegions } from "@/components/maps/signalWatchlist";

type AbnormalActivityFeedProps = {
  regions: RegionMarket[];
  signals: RegionSignal[];
  selectedCode?: string | null;
  minimumScore: number;
  signalKind: ActivitySignalFilter;
  maxAgeHours: ActivityTimeWindow;
  countryCode: string;
  watchlist: string[];
  watchedOnly: boolean;
  alertsEnabled: boolean;
  alertPermission: NotificationPermission | "unsupported";
  onMinimumScoreChange: (score: number) => void;
  onSignalKindChange: (kind: ActivitySignalFilter) => void;
  onMaxAgeHoursChange: (hours: ActivityTimeWindow) => void;
  onWatchedOnlyChange: (watchedOnly: boolean) => void;
  onAlertsEnabledChange: (enabled: boolean) => void;
  onToggleWatch: (countryCode: string, regionCode: string) => void;
  onSelect: (code: string) => void;
};

const THRESHOLDS = [
  { label: "All", value: 0 },
  { label: "50+", value: 50 },
  { label: "70+", value: 70 },
  { label: "85+", value: 85 }
] as const;

const SIGNAL_TYPES: Array<{ label: string; value: ActivitySignalFilter }> = [
  { label: "All signals", value: "all" },
  { label: "Whale flow", value: "whale-flow" },
  { label: "Order flow", value: "order-flow" },
  { label: "Volume anomaly", value: "volume-anomaly" },
  { label: "Price move", value: "price-move" },
  { label: "Poll divergence", value: "poll-divergence" },
  { label: "Normal", value: "normal" }
];

const TIME_WINDOWS: Array<{ label: string; value: ActivityTimeWindow }> = [
  { label: "Any time", value: 0 },
  { label: "Past hour", value: 1 },
  { label: "Past 6 hours", value: 6 },
  { label: "Past 24 hours", value: 24 }
];

export function AbnormalActivityFeed({
  regions,
  signals,
  selectedCode,
  minimumScore,
  signalKind,
  maxAgeHours,
  countryCode,
  watchlist,
  watchedOnly,
  alertsEnabled,
  alertPermission,
  onMinimumScoreChange,
  onSignalKindChange,
  onMaxAgeHoursChange,
  onWatchedOnlyChange,
  onAlertsEnabledChange,
  onToggleWatch,
  onSelect
}: AbnormalActivityFeedProps) {
  const rankedSignals = useMemo(
    () =>
      rankRegionSignals(
        filterWatchedRegions(regions, countryCode, watchlist, watchedOnly),
        signals,
        {
          minimumScore,
          signalKind,
          maxAgeHours
        }
      ).slice(0, 5),
    [
      countryCode,
      maxAgeHours,
      minimumScore,
      regions,
      signalKind,
      signals,
      watchedOnly,
      watchlist
    ]
  );

  return (
    <section className="border-t border-[var(--demo-card-divider)] pt-5" aria-labelledby="activity-feed-title">
      <div>
        <div>
          <p className="metric-label">Signal Scanner</p>
          <h3 id="activity-feed-title" className="mt-1 text-lg font-semibold text-slate-900">
            Abnormal activity
          </h3>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div
          className="flex divide-x divide-slate-200 overflow-hidden rounded-md border border-slate-200"
          role="group"
          aria-label="Minimum activity score"
        >
          {THRESHOLDS.map((threshold) => {
            const isActive = threshold.value === minimumScore;
            return (
              <button
                key={threshold.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onMinimumScoreChange(threshold.value)}
                className={`min-w-12 px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {threshold.label}
              </button>
            );
          })}
        </div>
        <label className="grid gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Signal
          <select
            value={signalKind}
            onChange={(event) => onSignalKindChange(event.target.value as ActivitySignalFilter)}
            className="min-h-8 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-700"
          >
            {SIGNAL_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Window
          <select
            value={maxAgeHours}
            onChange={(event) => onMaxAgeHoursChange(Number(event.target.value) as ActivityTimeWindow)}
            className="min-h-8 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-700"
          >
            {TIME_WINDOWS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-8 items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={watchedOnly}
            onChange={(event) => onWatchedOnlyChange(event.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          Watched only
        </label>
        <label className="flex min-h-8 items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={alertsEnabled}
            disabled={alertPermission === "denied" || alertPermission === "unsupported"}
            onChange={(event) => onAlertsEnabledChange(event.target.checked)}
            className="h-4 w-4 accent-slate-900 disabled:opacity-50"
          />
          Browser alerts
        </label>
        {alertPermission === "denied" || alertPermission === "unsupported" ? (
          <span className="pb-2 text-xs text-slate-400">
            {alertPermission === "denied" ? "Permission denied" : "Not supported"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 border-y border-[var(--demo-card-divider)]">
        <div className="hidden grid-cols-[42px_80px_minmax(0,1fr)_100px_64px_44px] gap-3 border-b border-[var(--demo-card-divider)] px-2 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:grid">
          <span>Rank</span>
          <span>Region</span>
          <span>Signal</span>
          <span>Freshness</span>
          <span className="text-right">Score</span>
          <span className="text-center">Watch</span>
        </div>

        {rankedSignals.length ? (
          <div className="divide-y divide-[var(--demo-card-divider)]">
            {rankedSignals.map(({ region, signal }, index) => {
              const isSelected = region.code === selectedCode;
              const watched = watchlist.includes(`${countryCode}:${region.code}`);
              return (
                <div
                  key={region.code}
                  className={`flex items-stretch transition ${
                    isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(region.code)}
                    className="grid min-w-0 flex-1 grid-cols-[52px_minmax(0,1fr)_44px] items-center gap-3 px-2 py-3 text-left sm:grid-cols-[42px_80px_minmax(0,1fr)_100px_64px]"
                  >
                    <span className="hidden text-xs tabular-nums text-slate-400 sm:block">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getMarketSignalColor(signal.score) }}
                      />
                      {region.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{signal.headline}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{getMarketSignalLabel(signal)}</span>
                    </span>
                    <span className="hidden text-xs text-slate-500 sm:block">
                      {signal.source === "live" ? relativeTime(signal.observedAt) : "demo snapshot"}
                    </span>
                    <span className="text-right text-xl font-semibold tabular-nums text-slate-900">
                      {signal.score}
                    </span>
                  </button>
                  <label className="flex w-11 shrink-0 cursor-pointer items-center justify-center">
                    <span className="sr-only">Watch {region.label}</span>
                    <input
                      type="checkbox"
                      checked={watched}
                      onChange={() => onToggleWatch(countryCode, region.code)}
                      className="h-4 w-4 accent-slate-900"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2 py-6 text-sm text-slate-500">No regions meet this activity threshold.</p>
        )}
      </div>
    </section>
  );
}
