import { NextRequest, NextResponse } from "next/server";
import { polymarketConfig } from "@/services/polymarket/config";
import { createOrderbookSnapshot } from "@/services/polymarket/mockData";
import { proxyJson, validateProxyBaseUrls } from "../_lib/proxy";

const isStaticExport = process.env.STATIC_EXPORT === "true";
export const revalidate = 1;

export async function GET(request: NextRequest) {
  if (isStaticExport) {
    return NextResponse.json(createOrderbookSnapshot());
  }

  const baseUrlError = validateProxyBaseUrls();
  if (baseUrlError) return baseUrlError;

  const tokenId = request.nextUrl.searchParams.get("tokenId");
  if (!tokenId) {
    return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
  }

  const url = `${polymarketConfig.clobBaseUrl}/book?token_id=${encodeURIComponent(tokenId)}`;
  try {
    return await proxyJson(url);
  } catch {
    return NextResponse.json({ error: "Orderbook proxy request failed" }, { status: 502 });
  }
}
