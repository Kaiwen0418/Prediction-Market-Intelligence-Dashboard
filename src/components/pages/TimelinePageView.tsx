"use client";

import { useDeferredValue } from "react";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { LoadingState } from "@/components/layout/LoadingState";
import { MetricCard } from "@/components/layout/MetricCard";
import { TopNav } from "@/components/navigation/TopNav";
import { useDashboardData } from "@/hooks/useDashboardData";

export function TimelinePageView() {
  const { isLoading, market, events, analytics } = useDashboardData();
  const deferredEvents = useDeferredValue(events);

  if (isLoading || !market || !analytics) {
    return <LoadingState label="Loading timeline events and market-impact context..." />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <TopNav />

      <section className="panel px-6 py-6">
        <p className="metric-label">Event Timeline</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Catalysts around {market.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          This route emphasizes event interpretation: which headlines matter, how large the moves were, and where the strongest catalysts appeared.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Tracked Events" value={String(events.length)} detail="Current timeline window" />
        <MetricCard label="Average Impact" value={`${analytics.eventImpact.averageImpact}%`} detail="Average absolute market move per event" />
        <MetricCard
          label="Strongest Move"
          value={`${analytics.eventImpact.strongestMove > 0 ? "+" : ""}${analytics.eventImpact.strongestMove}%`}
          detail={`Event id ${analytics.eventImpact.strongestEventId ?? "n/a"}`}
        />
      </section>

      <section className="panel px-6 py-6">
        <p className="metric-label">Catalyst Feed</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Events aligned with market movement</h2>
        <div className="mt-6">
          <EventTimeline events={deferredEvents} />
        </div>
      </section>
    </main>
  );
}
