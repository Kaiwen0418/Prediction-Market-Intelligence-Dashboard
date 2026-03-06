"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getNewsEvents } from "@/services/news/api";
import { getTimelineEvents } from "@/services/polymarket/api";
import type { MarketSnapshot } from "@/types/market";
import { useEventStore } from "@/stores/eventStore";

export function useTimelineData(market?: MarketSnapshot | null) {
  const setEvents = useEventStore((state) => state.setEvents);

  const query = useQuery({
    queryKey: ["timeline-events", market?.marketId],
    queryFn: () => getTimelineEvents(market ?? undefined)
  });

  useEffect(() => {
    if (query.data) {
      setEvents(query.data);
    }
  }, [query.data, setEvents]);

  return query;
}
