"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketContextLive } from "@/services/polymarket/rest";

export function useMarketContext(slug?: string) {
  return useQuery({
    queryKey: ["market-context", slug ?? "default"],
    queryFn: () => fetchMarketContextLive(slug),
    refetchInterval: 30_000
  });
}
