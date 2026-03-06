import type { MarketSnapshot } from "@/types/market";
import type { ValidationIssue } from "@/types/service";

export function validatePollingMarketCompatibility(market?: MarketSnapshot | null): ValidationIssue | null {
  if (!market) {
    return { stage: "config", message: "Polling adapter requires a market snapshot" };
  }

  if (market.slug !== "texas-republican-senate-primary-winner") {
    return { stage: "config", message: `No curated polling source mapped for slug ${market.slug}` };
  }

  return null;
}
