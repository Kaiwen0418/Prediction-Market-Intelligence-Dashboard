"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketContextLive } from "@/services/polymarket/rest";

export function useMarketContext(slug?: string, enabled = true) {
  return useQuery({
    queryKey: ["market-context", slug ?? "default"],
    queryFn: () => fetchMarketContextLive(slug),
    enabled,
    placeholderData: (previous) => previous,
    refetchInterval: 30_000
  });
}
