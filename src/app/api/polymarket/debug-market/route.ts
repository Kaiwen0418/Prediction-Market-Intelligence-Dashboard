import { NextRequest, NextResponse } from "next/server";
import { polymarketConfig } from "@/services/polymarket/config";
import { validateProxyBaseUrls, validateRequestedSlug } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  const baseUrlError = validateProxyBaseUrls();
  if (baseUrlError) return baseUrlError;

  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const slugError = validateRequestedSlug(slug);
  if (slugError) return slugError;

  const url = `${polymarketConfig.gammaBaseUrl}/events/slug/${slug}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const payload = (await response.json()) as Record<string, unknown>;
    const markets = Array.isArray(payload.markets) ? payload.markets : [];

    const summary = markets.map((market) => {
      const record = typeof market === "object" && market !== null ? (market as Record<string, unknown>) : {};
      return {
        id: record.id ?? null,
        question: record.question ?? null,
        title: record.title ?? null,
        conditionId: record.conditionId ?? null,
        clobTokenId: record.clobTokenId ?? null,
        clobTokenIds: record.clobTokenIds ?? null,
        outcomes: record.outcomes ?? null,
        outcomePrices: record.outcomePrices ?? null,
        tokens: record.tokens ?? null
      };
    });

    return NextResponse.json(
      {
        slug,
        eventTitle: payload.title ?? null,
        marketCount: summary.length,
        markets: summary
      },
      {
        status: response.status
      }
    );
  } catch {
    return NextResponse.json({ error: "Debug market request failed" }, { status: 502 });
  }
}
