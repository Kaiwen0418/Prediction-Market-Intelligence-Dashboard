"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { getOrderbookSnapshot } from "@/services/polymarket/api";
import { mergeNormalizedBookEvent } from "@/services/polymarket/normalizers";
import { useOrderbookStore } from "@/stores/orderbookStore";
import { useRawEventStore } from "@/stores/rawEventStore";
import { routeMarketStreamMessage } from "@/websocket/messageRouter";
import { orderbookStream } from "@/websocket/orderbookStream";
import { useRealtimeConnection } from "./useRealtimeConnection";

export function useOrderbook(tokenId?: string) {
  const orderbook = useOrderbookStore((state) => state.orderbook);
  const upsertOrderbook = useOrderbookStore((state) => state.upsertOrderbook);
  const pushEvents = useRawEventStore((state) => state.pushEvents);

  const snapshotQuery = useQuery({
    queryKey: ["orderbook-snapshot", tokenId],
    queryFn: () => getOrderbookSnapshot(tokenId),
    refetchInterval: tokenId ? 30_000 : 15_000
  });

  useEffect(() => {
    if (snapshotQuery.data) {
      upsertOrderbook(snapshotQuery.data);
    }
  }, [snapshotQuery.data, upsertOrderbook]);

  const handleBatch = useCallback(
    (events: ReturnType<typeof routeMarketStreamMessage>) => {
      pushEvents(events);

      let nextOrderbook = orderbook;
      for (const event of events) {
        nextOrderbook = mergeNormalizedBookEvent(nextOrderbook, event);
      }
      if (nextOrderbook) {
        upsertOrderbook(nextOrderbook);
      }
    },
    [orderbook, pushEvents, upsertOrderbook]
  );

  const connect = useCallback(
    (onBatch: (events: ReturnType<typeof routeMarketStreamMessage>) => void) => {
      orderbookStream.connect(tokenId, (payload) => {
        const events = routeMarketStreamMessage(payload);
        if (events.length) {
          onBatch(events);
        }
      });

      return () => {
        orderbookStream.disconnect();
      };
    },
    [tokenId]
  );

  useRealtimeConnection({
    enabled: Boolean(tokenId),
    connect,
    onBatch: handleBatch
  });

  return {
    orderbook,
    snapshotQuery
  };
}
