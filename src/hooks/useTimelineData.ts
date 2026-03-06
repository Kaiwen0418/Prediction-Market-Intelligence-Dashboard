"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getNewsEvents } from "@/services/news/api";
import { useEventStore } from "@/stores/eventStore";

export function useTimelineData() {
  const setEvents = useEventStore((state) => state.setEvents);

  const query = useQuery({
    queryKey: ["timeline-events"],
    queryFn: getNewsEvents
  });

  useEffect(() => {
    if (query.data) {
      setEvents(query.data);
    }
  }, [query.data, setEvents]);

  return query;
}
