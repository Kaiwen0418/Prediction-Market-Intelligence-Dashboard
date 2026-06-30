"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLiveDegradation, fetchLiveReadiness, fetchLiveRegistryHealth } from "@/services/polymarket/rest";

export function useLiveSystemHealth() {
  const readinessQuery = useQuery({
    queryKey: ["live-readiness"],
    queryFn: () => fetchLiveReadiness(),
    refetchInterval: 15_000,
  });

  const degradationQuery = useQuery({
    queryKey: ["live-degradation"],
    queryFn: () => fetchLiveDegradation(),
    refetchInterval: 15_000,
  });

  const registryHealthQuery = useQuery({
    queryKey: ["live-registry"],
    queryFn: () => fetchLiveRegistryHealth(),
    refetchInterval: 15_000,
  });

  return {
    readinessQuery,
    degradationQuery,
    registryHealthQuery,
  };
}
