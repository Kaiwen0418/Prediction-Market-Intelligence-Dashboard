"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLiveReplay } from "@/services/polymarket/rest";

export function useLiveReplay(slug?: string | null, limit = 60) {
  return useQuery({
    queryKey: ["live-replay", slug ?? "default", limit],
    queryFn: () => fetchLiveReplay(slug ?? undefined, limit),
    enabled: true,
    refetchInterval: 10_000,
  });
}
