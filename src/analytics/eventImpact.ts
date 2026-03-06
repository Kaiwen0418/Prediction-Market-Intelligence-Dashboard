import type { EventImpactResult } from "@/types/analytics";
import type { TimelineEvent } from "@/types/market";

export function calculateEventImpact(events: TimelineEvent[]): EventImpactResult {
  if (!events.length) {
    return {
      averageImpact: 0,
      strongestEventId: null,
      strongestMove: 0
    };
  }

  const averageImpact = events.reduce((sum, event) => sum + Math.abs(event.marketMove), 0) / events.length;
  const strongest = events.reduce((best, event) =>
    Math.abs(event.marketMove) > Math.abs(best.marketMove) ? event : best
  );

  return {
    averageImpact: Number(averageImpact.toFixed(2)),
    strongestEventId: strongest.id,
    strongestMove: strongest.marketMove
  };
}
