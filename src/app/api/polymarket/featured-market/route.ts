import { NextRequest, NextResponse } from "next/server";
import { polymarketConfig } from "@/services/polymarket/config";
import { featuredMarket } from "@/services/polymarket/mockData";
import { proxyJson, validateProxyBaseUrls, validateRequestedSlug } from "../_lib/proxy";

const isStaticExport = process.env.STATIC_EXPORT === "true";
export const revalidate = 60;

export async function GET(request: NextRequest) {
  if (isStaticExport) {
    return NextResponse.json({
      id: featuredMarket.eventId ?? featuredMarket.marketId,
      slug: featuredMarket.eventSlug ?? featuredMarket.slug,
      title: featuredMarket.title,
      category: featuredMarket.category,
      openInterest: featuredMarket.openInterest,
      liquidity: featuredMarket.liquidity ?? 0,
      volume24hr: featuredMarket.volume24h,
      markets: [
        {
          id: featuredMarket.marketId,
          question: featuredMarket.contractLabel ?? featuredMarket.title,
          title: featuredMarket.title,
          conditionId: featuredMarket.marketId,
          clobTokenId: featuredMarket.tokenId,
          clobTokenIds: JSON.stringify([featuredMarket.tokenId]),
          outcomes: JSON.stringify([featuredMarket.outcomeLabel ?? "Yes"]),
          outcomePrices: JSON.stringify([featuredMarket.probability]),
          openInterest: featuredMarket.openInterest,
          liquidity: featuredMarket.liquidity ?? 0,
          volume24hr: featuredMarket.volume24h
        }
      ]
    });
  }

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
