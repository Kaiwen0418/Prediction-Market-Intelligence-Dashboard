"use client";

export type StateSpotlightStatus = "live" | "watch" | "research";

export type StateSpotlight = {
  code: string;
  center: [number, number];
  fips: string;
  label: string;
  liveMarketSlug: string;
  note: string;
  zoom: number;
  status: StateSpotlightStatus;
};

export const SPOTLIGHT_STATES: StateSpotlight[] = [
  {
    code: "TX",
    center: [-99.3, 31.1],
    fips: "48",
    label: "Texas",
    liveMarketSlug: "texas-republican-senate-primary-winner",
    note: "Current live market focus. Republican Senate primary liquidity and price discovery are active here.",
    zoom: 3.2,
    status: "live"
  },
  {
    code: "AZ",
    center: [-111.7, 34.2],
    fips: "04",
    label: "Arizona",
    liveMarketSlug: "arizona-presidential-election-winner",
    note: "Historical battleground polling and PM comparison already exists in the research cache.",
    zoom: 4.2,
    status: "research"
  },
  {
    code: "GA",
    center: [-83.5, 32.7],
    fips: "13",
    label: "Georgia",
    liveMarketSlug: "georgia-presidential-election-winner",
    note: "Useful swing-state comparison surface for polling-vs-market behaviour.",
    zoom: 5,
    status: "research"
  },
  {
    code: "MI",
    center: [-85.5, 44.4],
    fips: "26",
    label: "Michigan",
    liveMarketSlug: "michigan-presidential-election-winner",
    note: "Research state with enough daily polling density to compare against cached PM paths.",
    zoom: 4.1,
    status: "research"
  },
  {
    code: "PA",
    center: [-77.7, 40.8],
    fips: "42",
    label: "Pennsylvania",
    liveMarketSlug: "pennsylvania-presidential-election-winner",
    note: "Dense battleground state with good fit for event-driven PM interpretation.",
    zoom: 5.2,
    status: "research"
  },
  {
    code: "WI",
    center: [-89.9, 44.6],
    fips: "55",
    label: "Wisconsin",
    liveMarketSlug: "wisconsin-presidential-election-winner",
    note: "Useful for comparing slower polling drift against discrete market repricing.",
    zoom: 5.4,
    status: "research"
  },
  {
    code: "FL",
    center: [-82.3, 28.4],
    fips: "12",
    label: "Florida",
    liveMarketSlug: "florida-presidential-election-winner",
    note: "Kept as a watch state placeholder for future live map expansion.",
    zoom: 4.2,
    status: "watch"
  },
  {
    code: "CA",
    center: [-119.4, 36.7],
    fips: "06",
    label: "California",
    liveMarketSlug: "california-governor-election-2026",
    note: "Governor market used as the current default live contract for the landing page rail.",
    zoom: 3.8,
    status: "watch"
  }
];

export function inferSpotlightCodeFromMarket(input: { slug: string; eventSlug?: string; title: string }) {
  const text = `${input.slug} ${input.eventSlug ?? ""} ${input.title}`.toLowerCase();
  const match = SPOTLIGHT_STATES.find((state) => text.includes(state.label.toLowerCase()));
  return match?.code ?? "TX";
}

export function getSpotlightState(code?: string | null) {
  return SPOTLIGHT_STATES.find((state) => state.code === code) ?? null;
}
