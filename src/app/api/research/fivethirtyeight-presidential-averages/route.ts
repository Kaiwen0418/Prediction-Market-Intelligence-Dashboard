import { NextResponse } from "next/server";

const csvUrl =
  "https://raw.githubusercontent.com/fivethirtyeight/data/master/polls/2024-averages/presidential_general_averages_2024-09-12_uncorrected.csv";
const fallbackCsv = "candidate,date,pct_trend_adjusted,state,cycle,party,pct_estimate,hi,lo\n";

const isStaticExport = process.env.STATIC_EXPORT === "true";
export const revalidate = 3600;

export async function GET() {
  if (isStaticExport) {
    return new NextResponse(fallbackCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  }

  try {
    const response = await fetch(csvUrl, {
      headers: {
        Accept: "text/csv"
      },
      cache: "no-store"
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "FiveThirtyEight CSV proxy request failed" }, { status: 502 });
  }
}
