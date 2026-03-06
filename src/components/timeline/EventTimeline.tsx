import type { TimelineEvent } from "@/types/market";
import { formatTimestamp } from "@/utils/time";

type EventTimelineProps = {
  events: TimelineEvent[];
};

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <div className="space-y-5">
      {events.map((event) => (
        <article key={event.id} className="relative rounded-3xl border border-slate-200 bg-white px-6 py-5">
          <div className="absolute left-0 top-7 h-5 w-1 rounded-r-full bg-tide" />
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="metric-label">{formatTimestamp(event.timestamp, "MMM d, yyyy HH:mm")}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{event.headline}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{event.summary}</p>
            </div>
            <div className="grid min-w-[180px] gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="metric-label">Source</p>
                <p className="mt-1 font-medium text-slate-900">{event.source}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="metric-label">Market Move</p>
                <p className="mt-1 font-medium text-slate-900">{event.marketMove > 0 ? "+" : ""}{event.marketMove}%</p>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
