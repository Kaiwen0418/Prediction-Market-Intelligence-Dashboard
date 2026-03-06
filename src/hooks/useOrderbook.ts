"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getOrderbookSnapshot } from "@/services/polymarket/api";
import { useOrderbookStore } from "@/stores/orderbookStore";
import { orderbookStream } from "@/websocket/orderbookStream";

export function useOrderbook() {
  const orderbook = useOrderbookStore((state) => state.orderbook);
  const upsertOrderbook = useOrderbookStore((state) => state.upsertOrderbook);

  const snapshotQuery = useQuery({
    queryKey: ["orderbook-snapshot"],
    queryFn: getOrderbookSnapshot,
    refetchInterval: 15_000
  });

  useEffect(() => {
    if (snapshotQuery.data) {
      upsertOrderbook(snapshotQuery.data);
    }
  }, [snapshotQuery.data, upsertOrderbook]);

  useEffect(() => {
    orderbookStream.connect((message) => {
      upsertOrderbook(message);
    });

    return () => {
      orderbookStream.disconnect();
    };
  }, [upsertOrderbook]);

  return {
    orderbook,
    snapshotQuery
  };
}
