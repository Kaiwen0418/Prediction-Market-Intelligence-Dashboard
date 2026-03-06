import { NextRequest, NextResponse } from "next/server";
import { polymarketConfig } from "@/services/polymarket/config";
import { proxyJson, validateProxyBaseUrls, validateRequestedSlug } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  const baseUrlError = validateProxyBaseUrls();
  if (baseUrlError) return baseUrlError;

  const slug = request.nextUrl.searchParams.get("slug") ?? polymarketConfig.featuredMarketSlug;
  const slugError = validateRequestedSlug(slug);
  if (slugError) return slugError;

  const bySlugUrl = `${polymarketConfig.gammaBaseUrl}/events/slug/${slug}`;

  try {
    return await proxyJson(bySlugUrl);
  } catch {
    const fallbackUrl = `${polymarketConfig.gammaBaseUrl}/events?slug=${encodeURIComponent(slug)}`;
    try {
      return await proxyJson(fallbackUrl);
    } catch {
      return NextResponse.json({ error: "Featured market proxy request failed" }, { status: 502 });
    }
  }
}
