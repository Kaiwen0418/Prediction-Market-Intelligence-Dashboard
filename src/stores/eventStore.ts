"use client";

import { create } from "zustand";
import type { TimelineEvent } from "@/types/market";

type EventStoreState = {
  events: TimelineEvent[];
  setEvents: (events: TimelineEvent[]) => void;
};

export const useEventStore = create<EventStoreState>((set) => ({
  events: [],
  setEvents: (events) => set({ events })
}));
