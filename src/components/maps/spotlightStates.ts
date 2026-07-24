"use client";

import type { RegionMarketSignal } from "@/components/maps/marketSignals";

export type RegionMarketStatus = "live" | "watch" | "research";

export type RegionMarket = {
  code: string;
  countryCode: string;
  countryLabel: string;
  center: [number, number];
  fips: string;
  label: string;
  liveMarketSlug: string;
  note: string;
  zoom: number;
  status: RegionMarketStatus;
  signal: RegionMarketSignal;
};

export type CountryMarketMap = {
  code: string;
  label: string;
  projection: "geoAlbersUsa";
  defaultCenter: [number, number];
  defaultZoom: number;
};

export const COUNTRY_MARKET_MAPS: CountryMarketMap[] = [
  {
    code: "US",
    label: "United States",
    projection: "geoAlbersUsa",
    defaultCenter: [-96, 38],
    defaultZoom: 1
  }
];

export const REGION_MARKETS: RegionMarket[] = [
  {
    code: "TX",
    countryCode: "US",
    countryLabel: "United States",
    center: [-99.3, 31.1],
    fips: "48",
    label: "Texas",
    liveMarketSlug: "texas-republican-senate-primary-winner",
    note: "Configured trading pair with live order-book and microstructure coverage.",
    zoom: 3.2,
    status: "live",
    signal: {
      kind: "whale-flow",
      score: 92,
      headline: "Whale-sized directional flow",
      detail: "Large directional trades and one-sided depth make this the highest-priority region in the demo scanner.",
      observedAt: "2026-07-24T09:40:00Z",
      source: "fixture"
    }
  },
  {
    code: "AZ",
    countryCode: "US",
    countryLabel: "United States",
    center: [-111.7, 34.2],
    fips: "04",
    label: "Arizona",
    liveMarketSlug: "arizona-presidential-election-winner",
    note: "Configured trading pair with cached price history for political market research.",
    zoom: 4.2,
    status: "research",
    signal: {
      kind: "price-move",
      score: 46,
      headline: "Price action within normal range",
      detail: "Movement remains below the abnormal-activity threshold.",
      observedAt: "2026-07-24T09:36:00Z",
      source: "fixture"
    }
  },
  {
    code: "GA",
    countryCode: "US",
    countryLabel: "United States",
    center: [-83.5, 32.7],
    fips: "13",
    label: "Georgia",
    liveMarketSlug: "georgia-presidential-election-winner",
    note: "Configured trading pair with cached price history for political market research.",
    zoom: 5,
    status: "research",
    signal: {
      kind: "normal",
      score: 31,
      headline: "No material anomaly",
      detail: "Trading activity is close to its recent baseline.",
      observedAt: "2026-07-24T09:34:00Z",
      source: "fixture"
    }
  },
  {
    code: "MI",
    countryCode: "US",
    countryLabel: "United States",
    center: [-85.5, 44.4],
    fips: "26",
    label: "Michigan",
    liveMarketSlug: "michigan-presidential-election-winner",
    note: "Configured trading pair with cached price history for political market research.",
    zoom: 4.1,
    status: "research",
    signal: {
      kind: "volume-anomaly",
      score: 55,
      headline: "Volume beginning to accelerate",
      detail: "Recent activity is elevated but has not reached a high-conviction threshold.",
      observedAt: "2026-07-24T09:38:00Z",
      source: "fixture"
    }
  },
  {
    code: "PA",
    countryCode: "US",
    countryLabel: "United States",
    center: [-77.7, 40.8],
    fips: "42",
    label: "Pennsylvania",
    liveMarketSlug: "pennsylvania-presidential-election-winner",
    note: "Configured trading pair with cached price history for political market research.",
    zoom: 5.2,
    status: "research",
    signal: {
      kind: "poll-divergence",
      score: 72,
      headline: "Market and polling paths diverge",
      detail: "The market-implied outcome has moved away from the latest polling baseline.",
      observedAt: "2026-07-24T09:39:00Z",
      source: "fixture"
    }
  },
  {
    code: "WI",
    countryCode: "US",
    countryLabel: "United States",
    center: [-89.9, 44.6],
    fips: "55",
    label: "Wisconsin",
    liveMarketSlug: "wisconsin-presidential-election-winner",
    note: "Configured trading pair with cached price history for political market research.",
    zoom: 5.4,
    status: "research",
    signal: {
      kind: "normal",
      score: 38,
      headline: "Order flow remains balanced",
      detail: "No unusual concentration or probability shock is present.",
      observedAt: "2026-07-24T09:31:00Z",
      source: "fixture"
    }
  },
  {
    code: "FL",
    countryCode: "US",
    countryLabel: "United States",
    center: [-82.3, 28.4],
    fips: "12",
    label: "Florida",
    liveMarketSlug: "florida-presidential-election-winner",
    note: "Configured watch pair. Select to inspect available market data.",
    zoom: 4.2,
    status: "watch",
    signal: {
      kind: "poll-divergence",
      score: 63,
      headline: "Moderate polling divergence",
      detail: "Market pricing is separating from the regional polling baseline.",
      observedAt: "2026-07-24T09:32:00Z",
      source: "fixture"
    }
  },
  {
    code: "CA",
    countryCode: "US",
    countryLabel: "United States",
    center: [-119.4, 36.7],
    fips: "06",
    label: "California",
    liveMarketSlug: "california-governor-election-2026",
    note: "Configured trading pair used by the default political market rail.",
    zoom: 3.8,
    status: "watch",
    signal: {
      kind: "volume-anomaly",
      score: 79,
      headline: "Unusual volume concentration",
      detail: "Turnover is concentrated in a short window relative to the demo baseline.",
      observedAt: "2026-07-24T09:41:00Z",
      source: "fixture"
    }
  }
];

export const SPOTLIGHT_STATES = REGION_MARKETS;

export function getCountryMarketMaps() {
  return COUNTRY_MARKET_MAPS.filter((country) => REGION_MARKETS.some((region) => region.countryCode === country.code));
}

export function getRegionMarketsByCountry(countryCode: string) {
  return REGION_MARKETS.filter((region) => region.countryCode === countryCode);
}

export function inferSpotlightCodeFromMarket(input: { slug: string; eventSlug?: string; title: string }) {
  const text = `${input.slug} ${input.eventSlug ?? ""} ${input.title}`.toLowerCase();
  const match = REGION_MARKETS.find(
    (region) => input.slug === region.liveMarketSlug || text.includes(region.label.toLowerCase())
  );
  return match?.code ?? "TX";
}

export function getSpotlightState(code?: string | null) {
  return REGION_MARKETS.find((region) => region.code === code) ?? null;
}

export function getRegionMarket(code?: string | null) {
  return getSpotlightState(code);
}

export function getRegionMarketPairLabel(region: RegionMarket) {
  return region.liveMarketSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
