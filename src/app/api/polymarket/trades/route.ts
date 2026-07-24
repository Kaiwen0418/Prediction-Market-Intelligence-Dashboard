import { NextRequest, NextResponse } from "next/server";
import { polymarketConfig } from "@/services/polymarket/config";
import { proxyJson, validateProxyBaseUrls } from "../_lib/proxy";

export const revalidate = 1;

export async function GET(request: NextRequest) {
  const baseUrlError = validateProxyBaseUrls();
  if (baseUrlError) return baseUrlError;

  const conditionId = request.nextUrl.searchParams.get("conditionId");
  if (!conditionId) {
    return NextResponse.json({ error: "conditionId is required" }, { status: 400 });
  }

  const url = `${polymarketConfig.dataApiBaseUrl}/trades?limit=100&takerOnly=true&market=${encodeURIComponent(conditionId)}`;
  try {
    return await proxyJson(url);
  } catch {
    return NextResponse.json({ error: "Trades proxy request failed" }, { status: 502 });
  }
}
