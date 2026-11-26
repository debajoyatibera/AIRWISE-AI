import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCATION } from "@/lib/locations";
import { fetchAirQuality } from "@/lib/open-meteo";
import { LocationSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const latParam = params.get("lat");
  const lonParam = params.get("lon");
  const refresh = params.get("refresh") === "1";

  let location = DEFAULT_LOCATION;

  if (latParam !== null || lonParam !== null) {
    const latitude = Number(latParam);
    const longitude = Number(lonParam);

    const parsed = LocationSchema.safeParse({
      id: params.get("id") || `custom-${latitude}-${longitude}`,
      name: params.get("name") || "Selected Location",
      admin1: params.get("admin1") || undefined,
      country: params.get("country") || "Unknown",
      latitude,
      longitude,
      timezone: params.get("timezone") || "auto",
      isPreset: false,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid location parameters supplied.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    location = parsed.data;
  }

  try {
    const report = await fetchAirQuality(location, refresh);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("[AIRWISE] Air quality fetch error:", error);
    return NextResponse.json(
      {
        error:
          "Unable to retrieve modelled air quality data from Open-Meteo right now. Please retry shortly.",
      },
      { status: 502 }
    );
  }
}
