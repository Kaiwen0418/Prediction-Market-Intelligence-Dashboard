"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getFeaturedMarket, getFeaturedMarketStrict, getHistoricalMarketSeries, getMarketBySlug, getMarketBySlugStrict } from "@/services/polymarket/api";
import { useMarketStore } from "@/stores/marketStore";

type UseMarketDataOptions = {
  strictFeaturedMarket?: boolean;
  slug?: string;
};

export function useMarketData(options: UseMarketDataOptions = {}) {
  const { strictFeaturedMarket = false, slug } = options;
  const setFeaturedMarket = useMarketStore((state) => state.setFeaturedMarket);
  const setSeries = useMarketStore((state) => state.setSeries);

  const featuredMarketQuery = useQuery({
    queryKey: ["featured-market", slug ?? "default", strictFeaturedMarket ? "strict" : "fallback"],
    queryFn: () => {
      if (slug) {
        return strictFeaturedMarket ? getMarketBySlugStrict(slug) : getMarketBySlug(slug);
      }
      return strictFeaturedMarket ? getFeaturedMarketStrict() : getFeaturedMarket();
    }
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
