"use client";

import type { RegionMarketSignal } from "@/components/maps/marketSignals";
import type { MarketSnapshot } from "@/types/market";

export type RegionMarketStatus = "live" | "watch" | "research";

export type RegionMarket = {
  code: string;
  countryCode: string;
  countryLabel: string;
  center: [number, number];
  featureId: string;
  label: string;
  liveMarketSlug: string;
  note: string;
  zoom: number;
  status: RegionMarketStatus;
  marketStatus?: MarketSnapshot["status"];
  signal: RegionMarketSignal;
};

export type CountryMarketMap = {
  code: string;
  worldFeatureIds: string[];
  label: string;
  projection: "geoAlbersUsa" | "geoMercator";
  featureIdProperty?: string;
  defaultRegionCode: string;
  defaultCenter: [number, number];
  defaultZoom: number;
  projectionScale?: number;
  boundarySourceLabel: string;
  boundarySourceUrl: string;
};

export const COUNTRY_MARKET_MAPS: CountryMarketMap[] = [
  {
    code: "US",
    worldFeatureIds: ["840"],
    label: "United States",
    projection: "geoAlbersUsa",
    defaultRegionCode: "CA",
    defaultCenter: [-96, 38],
    defaultZoom: 1,
    boundarySourceLabel: "US Census Bureau",
    boundarySourceUrl: "https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html"
  },
  {
    code: "GB",
    worldFeatureIds: ["826"],
    label: "United Kingdom",
    projection: "geoMercator",
    featureIdProperty: "AREACD",
    defaultRegionCode: "SCT",
    defaultCenter: [-3.5, 55.2],
    defaultZoom: 1,
    projectionScale: 1_650,
    boundarySourceLabel: "Office for National Statistics",
    boundarySourceUrl: "https://github.com/ONSvisual/topojson_boundaries"
  },
  {
    code: "EU",
    worldFeatureIds: ["250", "276", "380", "724", "352"],
    label: "Europe",
    projection: "geoMercator",
    defaultRegionCode: "FR",
    defaultCenter: [10, 51],
    defaultZoom: 1,
    boundarySourceLabel: "Natural Earth",
    boundarySourceUrl: "https://github.com/topojson/world-atlas"
  }
];

export const REGION_MARKETS: RegionMarket[] = [
  {
    code: "TX",
    countryCode: "US",
    countryLabel: "United States",
    center: [-99.3, 31.1],
    featureId: "48",
    label: "Texas",
    liveMarketSlug: "texas-republican-senate-primary-winner",
    note: "Order book and recent market activity are available.",
    zoom: 3.2,
    status: "live",
    marketStatus: "closed",
    signal: {
      kind: "whale-flow",
      score: 92,
      headline: "Whale-sized directional flow",
      detail: "Large directional trades and one-sided depth make this the highest-priority region in the scanner.",
      observedAt: "2026-07-24T09:40:00Z",
      source: "fixture"
    }
  },
  {
    code: "AZ",
    countryCode: "US",
    countryLabel: "United States",
    center: [-111.7, 34.2],
    featureId: "04",
    label: "Arizona",
    liveMarketSlug: "arizona-presidential-election-winner",
    note: "Historical pricing is available for this political market.",
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
    featureId: "13",
    label: "Georgia",
    liveMarketSlug: "georgia-presidential-election-winner",
    note: "Historical pricing is available for this political market.",
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
    featureId: "26",
    label: "Michigan",
    liveMarketSlug: "michigan-presidential-election-winner",
    note: "Historical pricing is available for this political market.",
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
    featureId: "42",
    label: "Pennsylvania",
    liveMarketSlug: "pennsylvania-presidential-election-winner",
    note: "Historical pricing is available for this political market.",
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
    featureId: "55",
    label: "Wisconsin",
    liveMarketSlug: "wisconsin-presidential-election-winner",
    note: "Historical pricing is available for this political market.",
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
    featureId: "12",
    label: "Florida",
    liveMarketSlug: "florida-presidential-election-winner",
    note: "Select this market to inspect available pricing and signals.",
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
    featureId: "06",
    label: "California",
    liveMarketSlug: "california-governor-election-2026",
    note: "California governor market with regional signal coverage.",
    zoom: 3.8,
    status: "watch",
    marketStatus: "open",
    signal: {
      kind: "volume-anomaly",
      score: 79,
      headline: "Unusual volume concentration",
      detail: "Turnover is concentrated in a short window relative to its recent baseline.",
      observedAt: "2026-07-24T09:41:00Z",
      source: "fixture"
    }
  },
  {
    code: "SCT",
    countryCode: "GB",
    countryLabel: "United Kingdom",
    center: [-4.2, 56.7],
    featureId: "S92000003",
    label: "Scotland",
    liveMarketSlug: "will-scotland-hold-an-independence-referendum-before-2030",
    note: "Constitutional politics market with regional signal coverage.",
    zoom: 1,
    status: "research",
    signal: {
      kind: "poll-divergence",
      score: 74,
      headline: "Referendum pricing diverges from polling",
      detail: "The market is trading away from the latest constitutional polling baseline.",
      observedAt: "2026-07-24T10:05:00Z",
      source: "fixture"
    }
  },
  {
    code: "FR",
    countryCode: "EU",
    countryLabel: "Europe",
    center: [2.2, 46.3],
    featureId: "250",
    label: "France",
    liveMarketSlug: "next-french-presidential-election",
    note: "French presidential market with active liquidity and regional signal coverage.",
    zoom: 5,
    status: "live",
    marketStatus: "open",
    signal: {
      kind: "volume-anomaly",
      score: 88,
      headline: "Presidential market turnover is accelerating",
      detail: "French election turnover is elevated relative to the broader European political market set.",
      observedAt: "2026-07-24T14:25:00Z",
      source: "fixture"
    }
  },
  {
    code: "DE",
    countryCode: "EU",
    countryLabel: "Europe",
    center: [10.4, 51.1],
    featureId: "276",
    label: "Germany",
    liveMarketSlug: "berlin-state-election-winner",
    note: "Berlin state election market represented at country level in the Europe scanner.",
    zoom: 5,
    status: "live",
    marketStatus: "open",
    signal: {
      kind: "order-flow",
      score: 76,
      headline: "Berlin election flow is one-sided",
      detail: "Directional order flow in the Berlin state election is elevated against its recent baseline.",
      observedAt: "2026-07-24T14:20:00Z",
      source: "fixture"
    }
  },
  {
    code: "ES",
    countryCode: "EU",
    countryLabel: "Europe",
    center: [-3.7, 40.2],
    featureId: "724",
    label: "Spain",
    liveMarketSlug: "next-prime-minister-of-spain-20260625005215443",
    note: "Next-prime-minister market with country-level signal coverage.",
    zoom: 5,
    status: "watch",
    marketStatus: "open",
    signal: {
      kind: "price-move",
      score: 69,
      headline: "Leadership pricing moved sharply",
      detail: "The leading Spanish prime-minister outcome has repriced faster than its recent range.",
      observedAt: "2026-07-24T14:18:00Z",
      source: "fixture"
    }
  },
  {
    code: "IT",
    countryCode: "EU",
    countryLabel: "Europe",
    center: [12.6, 42.8],
    featureId: "380",
    label: "Italy",
    liveMarketSlug: "next-prime-minister-of-italy",
    note: "Next-prime-minister market with country-level signal coverage.",
    zoom: 5,
    status: "watch",
    marketStatus: "open",
    signal: {
      kind: "poll-divergence",
      score: 58,
      headline: "Leadership market differs from baseline",
      detail: "Italian leadership pricing is moderately separated from the current comparison baseline.",
      observedAt: "2026-07-24T14:15:00Z",
      source: "fixture"
    }
  },
  {
    code: "IS",
    countryCode: "EU",
    countryLabel: "Europe",
    center: [-18.6, 64.9],
    featureId: "352",
    label: "Iceland",
    liveMarketSlug:
      "icelandic-european-union-membership-negotiations-referendum-passes-20260609135241589",
    note: "European Union membership referendum market with country-level signal coverage.",
    zoom: 5,
    status: "research",
    marketStatus: "open",
    signal: {
      kind: "volume-anomaly",
      score: 52,
      headline: "Referendum activity is above baseline",
      detail: "Trading in Iceland's EU membership referendum is beginning to accelerate.",
      observedAt: "2026-07-24T14:12:00Z",
      source: "fixture"
    }
  },
  {
    code: "LDN",
    countryCode: "GB",
    countryLabel: "United Kingdom",
    center: [-0.1, 51.5],
    featureId: "E12000007",
    label: "London",
    liveMarketSlug: "next-london-mayoral-election-winner",
    note: "Mayoral election market with regional signal coverage.",
    zoom: 1,
    status: "watch",
    signal: {
      kind: "volume-anomaly",
      score: 68,
      headline: "Mayoral market volume is elevated",
      detail: "Recent turnover is above the London market's recent baseline.",
      observedAt: "2026-07-24T10:02:00Z",
      source: "fixture"
    }
  },
  {
    code: "WLS",
    countryCode: "GB",
    countryLabel: "United Kingdom",
    center: [-3.7, 52.3],
    featureId: "W92000004",
    label: "Wales",
    liveMarketSlug: "welsh-parliament-election-most-seats",
    note: "Senedd election market with regional signal coverage.",
    zoom: 1,
    status: "research",
    signal: {
      kind: "price-move",
      score: 57,
      headline: "Senedd pricing is repricing",
      detail: "The leading-outcome probability has moved faster than its recent baseline.",
      observedAt: "2026-07-24T09:58:00Z",
      source: "fixture"
    }
  },
  {
    code: "NIR",
    countryCode: "GB",
    countryLabel: "United Kingdom",
    center: [-6.8, 54.7],
    featureId: "N92000002",
    label: "Northern Ireland",
    liveMarketSlug: "northern-ireland-assembly-election-most-seats",
    note: "Assembly election market with regional signal coverage.",
    zoom: 1,
    status: "research",
    signal: {
      kind: "order-flow",
      score: 43,
      headline: "Assembly market flow remains balanced",
      detail: "Directional activity remains below the abnormal-flow threshold.",
      observedAt: "2026-07-24T09:55:00Z",
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

export function marketMatchesRegion(
  region: RegionMarket | null | undefined,
  market: Pick<MarketSnapshot, "slug" | "eventSlug"> | null | undefined
) {
  if (!region) {
    return true;
  }

  if (!market) {
    return false;
  }

  return market.slug === region.liveMarketSlug || market.eventSlug === region.liveMarketSlug;
}
