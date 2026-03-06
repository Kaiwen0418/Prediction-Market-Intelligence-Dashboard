"use client";

import { create } from "zustand";
import type { NormalizedBookEvent } from "@/types/ws";

type RawEventStoreState = {
  events: NormalizedBookEvent[];
  pushEvents: (events: NormalizedBookEvent[]) => void;
  clear: () => void;
};

export const useRawEventStore = create<RawEventStoreState>((set) => ({
  events: [],
  pushEvents: (events) =>
    set((state) => ({
      events: [...events, ...state.events].slice(0, 200)
    })),
  clear: () => set({ events: [] })
}));
