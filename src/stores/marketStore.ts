"use client";

import { create } from "zustand";
import type { MarketSnapshot, TimePoint } from "@/types/market";

type MarketStoreState = {
  featuredMarket: MarketSnapshot | null;
  series: TimePoint[];
  setFeaturedMarket: (market: MarketSnapshot) => void;
  setSeries: (series: TimePoint[]) => void;
};

export const useMarketStore = create<MarketStoreState>((set) => ({
  featuredMarket: null,
  series: [],
  setFeaturedMarket: (featuredMarket) => set({ featuredMarket }),
  setSeries: (series) => set({ series })
}));
