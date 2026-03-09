import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
const CLOB_BASE_URL = "https://clob.polymarket.com";

const stateRegistry = [
  { state: "Arizona", eventSlug: "arizona-presidential-election-winner" },
  { state: "Georgia", eventSlug: "georgia-presidential-election-winner" },
  { state: "Michigan", eventSlug: "michigan-presidential-election-winner" },
  { state: "Pennsylvania", eventSlug: "pennsylvania-presidential-election-winner" },
  { state: "Wisconsin", eventSlug: "wisconsin-presidential-election-winner" }
];

function asNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function firstString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function parseTokenMetadata(payload) {
  const tokenIds = parseJsonArray(payload.clobTokenIds);
  const outcomes = parseJsonArray(payload.outcomes);
  const outcomePrices = parseJsonArray(payload.outcomePrices);
  const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];
  const tokenRecord = tokens.find((token) => typeof token === "object" && token !== null) ?? {};

  return {
    tokenId:
      firstString([tokenIds[0], payload.clobTokenId, tokenRecord.token_id, tokenRecord.asset_id, payload.conditionId]) ??
      undefined,
    outcomeLabel: firstString([outcomes[0], tokenRecord.outcome, "Yes"]),
    probability: asNumber(outcomePrices[0], asNumber(tokenRecord.price, asNumber(payload.lastTradePrice, 0.5)))
  };
}

function normalizeEventMarketCandidate(event, market) {
  const { tokenId, outcomeLabel, probability } = parseTokenMetadata(market);
  if (!tokenId) return null;

  const contractLabel = asString(market.question, asString(market.title, ""));
  const normalizedOutcomeLabel =
    outcomeLabel && ["yes", "no"].includes(outcomeLabel.toLowerCase()) && contractLabel ? contractLabel : outcomeLabel;

  return {
    marketId: asString(market.id, asString(market.conditionId, tokenId)),
    tokenId,
    eventSlug: asString(event.slug),
    title: asString(event.title, asString(event.slug)),
    outcomeLabel: normalizedOutcomeLabel ?? contractLabel,
    contractLabel,
    probability
  };
}

function preferredOutcomeLabelsForParty(party) {
  return party === "Republican"
    ? ["Donald Trump", "Trump", "Donald J. Trump", "Republican"]
    : ["Kamala Harris", "Harris", "Kamala D. Harris", "Democrat", "Democratic"];
}

function pickMarketForParty(eventPayload, party) {
  const markets = Array.isArray(eventPayload.markets) ? eventPayload.markets : [];
  const candidates = markets
    .filter((market) => typeof market === "object" && market !== null)
    .map((market) => normalizeEventMarketCandidate(eventPayload, market))
    .filter(Boolean);

  const preferredLabels = preferredOutcomeLabelsForParty(party);
  const preferred = candidates.find((candidate) =>
    preferredLabels.some((label) => {
      const lowered = label.toLowerCase();
      return (
        candidate.outcomeLabel?.toLowerCase().includes(lowered) ||
        candidate.contractLabel?.toLowerCase().includes(lowered) ||
        candidate.title.toLowerCase().includes(lowered)
      );
    })
  );

  return preferred ?? candidates.sort((left, right) => right.probability - left.probability)[0] ?? null;
}

async function requestJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

function normalizePriceHistory(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray(payload.history)
      ? payload.history
      : payload && typeof payload === "object" && Array.isArray(payload.data)
        ? payload.data
        : [];

  return rows
    .filter((row) => typeof row === "object" && row !== null)
    .map((row) => {
      const timestampValue = row.t ?? row.timestamp;
      const priceValue = row.p ?? row.price;
      const timestamp =
        typeof timestampValue === "number"
          ? new Date(timestampValue * 1000).toISOString()
          : asString(timestampValue, new Date().toISOString());

      return {
        timestamp,
        value: asNumber(priceValue)
      };
    })
    .filter((point) => point.value > 0);
}

async function fetchStateHistory(stateEntry) {
  const eventPayload = await requestJson(`${GAMMA_BASE_URL}/events/slug/${stateEntry.eventSlug}`);
  const parties = {};

  for (const party of ["Republican", "Democrat"]) {
    const market = pickMarketForParty(eventPayload, party);
    if (!market?.tokenId) {
      parties[party] = null;
      continue;
    }

    const historyPayload = await requestJson(
      `${CLOB_BASE_URL}/prices-history?interval=all&market=${encodeURIComponent(market.tokenId)}&fidelity=720`
    );

    parties[party] = {
      marketId: market.marketId,
      tokenId: market.tokenId,
      title: market.title,
      outcomeLabel: market.outcomeLabel,
      contractLabel: market.contractLabel,
      series: normalizePriceHistory(historyPayload)
    };
  }

  return {
    state: stateEntry.state,
    eventSlug: stateEntry.eventSlug,
    parties
  };
}

async function main() {
  const states = [];

  for (const stateEntry of stateRegistry) {
    const stateHistory = await fetchStateHistory(stateEntry);
    states.push(stateHistory);
    console.log(
      `Fetched ${stateEntry.state}: REP=${stateHistory.parties.Republican?.series.length ?? 0}, DEM=${stateHistory.parties.Democrat?.series.length ?? 0}`
    );
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceUrls: {
      gamma: GAMMA_BASE_URL,
      clob: CLOB_BASE_URL
    },
    description: "Polymarket state history snapshots fetched offline from event slugs and stored as a public resource for the history page.",
    states
  };

  const outputDir = path.resolve(process.cwd(), "public", "data");
  const outputPath = path.join(outputDir, "polymarket-history-2024.json");

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${states.length} states to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
