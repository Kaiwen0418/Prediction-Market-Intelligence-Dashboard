"use client";

import { useEffect, useState } from "react";
import { withApiBase } from "@/services/api/base";
import { useDataSourceStore } from "@/stores/dataSourceStore";
import type { LiveMarketSnapshot } from "@/types/market";

type LiveMarketStreamState = {
  snapshot: LiveMarketSnapshot | null;
  connected: boolean;
};

const STREAM_SOURCE_KEY = "live-stream";

export function useLiveMarketStream(slug?: string | null) {
  const [state, setState] = useState<LiveMarketStreamState>({
    snapshot: null,
    connected: false
  });

  useEffect(() => {
    useDataSourceStore.getState().markPending(STREAM_SOURCE_KEY);
    setState({
      snapshot: null,
      connected: false
    });

    const path = slug ? `/api/live/stream?slug=${encodeURIComponent(slug)}` : "/api/live/stream";
    const eventSource = new EventSource(withApiBase(path));

    const handleSnapshot = (event: MessageEvent<string>) => {
      try {
        const snapshot = JSON.parse(event.data) as LiveMarketSnapshot;
        const hasSummary = Boolean(snapshot.orderbookSummary);
        const matchesRequestedSlug = !slug || snapshot.status.marketSlug === slug;
        const isUsable = snapshot.status.enabled && snapshot.status.state === "connected" && hasSummary && matchesRequestedSlug;

        setState({
          snapshot,
          connected: isUsable
        });

        if (isUsable) {
          useDataSourceStore.getState().markLive(STREAM_SOURCE_KEY);
          return;
        }

        useDataSourceStore.getState().markFailed(STREAM_SOURCE_KEY, {
          stage: "payload",
          message:
            snapshot.status.error ??
            `Live stream state=${snapshot.status.state}, summary=${hasSummary ? "present" : "missing"}, slug=${snapshot.status.marketSlug}`
        });
      } catch {
        useDataSourceStore.getState().markFailed(STREAM_SOURCE_KEY, {
          stage: "payload",
          message: "Live stream snapshot could not be parsed"
        });
      }
    };

    const handleError = () => {
      setState((current) => ({ ...current, connected: false }));
      useDataSourceStore.getState().markFailed(STREAM_SOURCE_KEY, {
        stage: "reachability",
        message: "Live SSE connection failed"
      });
    };

    eventSource.addEventListener("snapshot", handleSnapshot as EventListener);
    eventSource.onerror = handleError;

    return () => {
      eventSource.removeEventListener("snapshot", handleSnapshot as EventListener);
      eventSource.close();
    };
  }, [slug]);

  return state;
}
