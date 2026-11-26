import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/open-meteo";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Please enter at least 2 characters to search cities." },
      { status: 400 }
    );
  }

  if (query.length > 80) {
    return NextResponse.json(
      { error: "Search query is too long." },
      { status: 400 }
    );
  }

  try {
    const locations = await searchCities(query);
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("[AIRWISE] Geocoding error:", error);
    return NextResponse.json(
      {
        error:
          "Unable to search cities from Open-Meteo Geocoding API right now. Please try again.",
      },
      { status: 502 }
    );
  }
}
