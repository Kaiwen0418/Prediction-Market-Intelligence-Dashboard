import type { ValidationIssue } from "@/types/service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasArray(value: unknown, key: string) {
  return isRecord(value) && Array.isArray(value[key]);
}

export function validateBaseUrl(url: string, label: string): ValidationIssue | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "ws:", "wss:"].includes(parsed.protocol)) {
      return { stage: "config", message: `${label} uses unsupported protocol` };
    }
    return null;
  } catch {
    return { stage: "config", message: `${label} is not a valid URL` };
  }
}

export function validateSlug(slug: string): ValidationIssue | null {
  return slug.trim().length > 0 ? null : { stage: "config", message: "Featured market slug is empty" };
}

export function validateGammaMarketPayload(payload: unknown): ValidationIssue | null {
  if (!isRecord(payload)) {
    return { stage: "payload", message: "Gamma market payload is not an object" };
  }

  const hasQuestion = typeof payload.question === "string" || typeof payload.title === "string";
  const hasTokenData =
    typeof payload.clobTokenIds === "string" ||
    typeof payload.clobTokenId === "string" ||
    (Array.isArray(payload.tokens) && payload.tokens.length > 0);

  if (!hasQuestion) {
    return { stage: "payload", message: "Gamma market payload is missing title/question" };
  }
  if (!hasTokenData) {
    return { stage: "payload", message: "Gamma market payload is missing token identifiers" };
  }

  return null;
}

export function validatePriceHistoryPayload(payload: unknown): ValidationIssue | null {
  const valid =
    Array.isArray(payload) ||
    hasArray(payload, "history") ||
    hasArray(payload, "data");

  return valid ? null : { stage: "payload", message: "Price history payload does not contain a history array" };
}

export function validateOrderbookPayload(payload: unknown): ValidationIssue | null {
  if (!isRecord(payload)) {
    return { stage: "payload", message: "Orderbook payload is not an object" };
  }
  if (!Array.isArray(payload.bids) || !Array.isArray(payload.asks)) {
    return { stage: "payload", message: "Orderbook payload is missing bids/asks arrays" };
  }
  return null;
}

export function validateTradesPayload(payload: unknown): ValidationIssue | null {
  return Array.isArray(payload) ? null : { stage: "payload", message: "Trades payload is not an array" };
}
