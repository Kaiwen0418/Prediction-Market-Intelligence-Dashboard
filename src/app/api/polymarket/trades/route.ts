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

  const url = `${polymarketConfig.gammaBaseUrl}/trades?limit=20&market=${encodeURIComponent(tokenId)}`;
  try {
    return await proxyJson(url);
  } catch {
    return NextResponse.json({ error: "Trades proxy request failed" }, { status: 502 });
  }
}
