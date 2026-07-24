"use client";

import { useMemo } from "react";
import {
  getMarketSignalColor,
  getMarketSignalLabel,
  rankRegionSignals
} from "@/components/maps/marketSignals";
import type { RegionMarket } from "@/components/maps/spotlightStates";
import type { RegionSignal } from "@/types/signals";
import { relativeTime } from "@/utils/time";

type AbnormalActivityFeedProps = {
  regions: RegionMarket[];
  signals: RegionSignal[];
  selectedCode?: string | null;
  minimumScore: number;
  onMinimumScoreChange: (score: number) => void;
  onSelect: (code: string) => void;
};

const THRESHOLDS = [
  { label: "All", value: 0 },
  { label: "50+", value: 50 },
  { label: "70+", value: 70 },
  { label: "85+", value: 85 }
] as const;

export function AbnormalActivityFeed({
  regions,
  signals,
  selectedCode,
  minimumScore,
  onMinimumScoreChange,
  onSelect
}: AbnormalActivityFeedProps) {
  const rankedSignals = useMemo(
    () => rankRegionSignals(regions, signals, minimumScore).slice(0, 5),
    [minimumScore, regions, signals]
  );

  return (
    <section className="border-t border-[var(--demo-card-divider)] pt-5" aria-labelledby="activity-feed-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="metric-label">Signal Scanner</p>
          <h3 id="activity-feed-title" className="mt-1 text-lg font-semibold text-slate-900">
            Abnormal activity
          </h3>
        </div>
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
      </div>

      <div className="mt-4 border-y border-[var(--demo-card-divider)]">
        <div className="hidden grid-cols-[42px_80px_minmax(0,1fr)_100px_64px] gap-3 border-b border-[var(--demo-card-divider)] px-2 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:grid">
          <span>Rank</span>
          <span>Region</span>
          <span>Signal</span>
          <span>Freshness</span>
          <span className="text-right">Score</span>
        </div>

        {rankedSignals.length ? (
          <div className="divide-y divide-[var(--demo-card-divider)]">
            {rankedSignals.map(({ region, signal }, index) => {
              const isSelected = region.code === selectedCode;
              return (
                <button
                  key={region.code}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(region.code)}
                  className={`grid w-full grid-cols-[52px_minmax(0,1fr)_44px] items-center gap-3 px-2 py-3 text-left transition sm:grid-cols-[42px_80px_minmax(0,1fr)_100px_64px] ${
                    isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
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
