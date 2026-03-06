import { NextRequest, NextResponse } from "next/server";
import { polymarketConfig } from "@/services/polymarket/config";
import { proxyJson, validateProxyBaseUrls } from "../_lib/proxy";

export async function GET(request: NextRequest) {
  const baseUrlError = validateProxyBaseUrls();
  if (baseUrlError) return baseUrlError;

  const tokenId = request.nextUrl.searchParams.get("tokenId");
  if (!tokenId) {
    return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
  }

  const url = `${polymarketConfig.clobBaseUrl}/prices-history?market=${encodeURIComponent(tokenId)}&interval=1w&fidelity=1440`;
  try {
    return await proxyJson(url);
  } catch {
    return NextResponse.json({ error: "Price history proxy request failed" }, { status: 502 });
  }
}
