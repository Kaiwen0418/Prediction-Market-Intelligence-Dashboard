"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketSnapshot } from "@/types/market";
import { getPollingAverage } from "@/services/polling/api";

export function usePollingData(market?: MarketSnapshot | null) {
  return useQuery({
    queryKey: ["polling-average", market?.slug, market?.outcomeLabel],
    queryFn: () => getPollingAverage(market),
    enabled: Boolean(market)
  });
}
