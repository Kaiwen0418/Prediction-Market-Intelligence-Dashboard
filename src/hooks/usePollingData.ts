"use client";

import { useQuery } from "@tanstack/react-query";
import { getPollingAverage } from "@/services/polling/api";

export function usePollingData() {
  return useQuery({
    queryKey: ["polling-average"],
    queryFn: getPollingAverage
  });
}
