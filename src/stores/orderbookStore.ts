"use client";

import { create } from "zustand";
import type { OrderbookState } from "@/types/market";

type OrderbookStoreState = {
  orderbook: OrderbookState | null;
  upsertOrderbook: (nextOrderbook: OrderbookState) => void;
};

export const useOrderbookStore = create<OrderbookStoreState>((set) => ({
  orderbook: null,
  upsertOrderbook: (nextOrderbook) => set({ orderbook: nextOrderbook })
}));
