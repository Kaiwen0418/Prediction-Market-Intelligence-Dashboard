import { withApiBase } from "@/services/api/base";
import type { VenueMarketSummary } from "@/types/market";
import { kalshiConfig } from "./config";
import { normalizeKalshiEvents } from "./normalizers";

export async function fetchKalshiEvents(
  eventTickers: string[]
): Promise<VenueMarketSummary[]> {
  const tickers = [...new Set(eventTickers)]
    .filter((ticker) => /^[A-Z0-9-]{2,80}$/.test(ticker))
    .slice(0, 20);
  if (!tickers.length) return [];

  const path = `/api/kalshi/events?tickers=${encodeURIComponent(
    tickers.join(",")
  )}`;
  const urls = [path, withApiBase(path)].filter(
    (url, index, all) => all.indexOf(url) === index
  );

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      kalshiConfig.requestTimeoutMs
    );

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) continue;

      const markets = normalizeKalshiEvents(await response.json());
      if (markets.length) return markets;
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return [];
}
