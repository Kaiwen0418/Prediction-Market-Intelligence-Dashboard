"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getFeaturedMarket, getHistoricalMarketSeries } from "@/services/polymarket/api";
import { useMarketStore } from "@/stores/marketStore";

export function useMarketData() {
  const setFeaturedMarket = useMarketStore((state) => state.setFeaturedMarket);
  const setSeries = useMarketStore((state) => state.setSeries);

  const featuredMarketQuery = useQuery({
    queryKey: ["featured-market"],
    queryFn: getFeaturedMarket
  });

  const historicalSeriesQuery = useQuery({
    queryKey: ["historical-market-series", featuredMarketQuery.data?.tokenId],
    queryFn: () => getHistoricalMarketSeries(featuredMarketQuery.data?.tokenId),
    enabled: Boolean(featuredMarketQuery.data)
  });

  useEffect(() => {
    if (featuredMarketQuery.data) {
      setFeaturedMarket(featuredMarketQuery.data);
    }
  }, [featuredMarketQuery.data, setFeaturedMarket]);

  useEffect(() => {
    if (historicalSeriesQuery.data) {
      setSeries(historicalSeriesQuery.data);
    }
  }, [historicalSeriesQuery.data, setSeries]);

  return {
    featuredMarket: featuredMarketQuery.data ?? null,
    marketSeries: historicalSeriesQuery.data ?? [],
    featuredMarketQuery,
    historicalSeriesQuery
  };
}
