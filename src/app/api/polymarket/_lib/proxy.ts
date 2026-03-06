import { NextResponse } from "next/server";
import { polymarketConfig } from "@/services/polymarket/config";
import { validateBaseUrl, validateSlug } from "@/services/polymarket/preflight";

export async function proxyJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export function validateProxyBaseUrls() {
  const gammaUrlIssue = validateBaseUrl(polymarketConfig.gammaBaseUrl, "Gamma base URL");
  if (gammaUrlIssue) {
    return NextResponse.json({ error: gammaUrlIssue.message }, { status: 500 });
  }

  const clobUrlIssue = validateBaseUrl(polymarketConfig.clobBaseUrl, "CLOB base URL");
  if (clobUrlIssue) {
    return NextResponse.json({ error: clobUrlIssue.message }, { status: 500 });
  }

  return null;
}

export function validateRequestedSlug(slug: string) {
  const slugIssue = validateSlug(slug);
  if (slugIssue) {
    return NextResponse.json({ error: slugIssue.message }, { status: 400 });
  }
  return null;
}
