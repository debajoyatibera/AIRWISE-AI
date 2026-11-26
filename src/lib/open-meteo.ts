import { z } from "zod";
import {
  findLowerPollutionWindows,
  formatHourLabel,
  splitPastAndForecast,
} from "./aqi";
import { TtlCache } from "./cache";
import type { AirQualityReport, HourlyPoint, LocationOption } from "./types";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const geocodingCache = new TtlCache<LocationOption[]>(100);
const airQualityCache = new TtlCache<AirQualityReport>(100);

const GEOCODING_TTL_MS = 10 * 60 * 1000; // 10 minutes
const AIR_QUALITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

const GeocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .optional(),
});

const NullableNumberArray = z.array(z.number().nullable());

const AirQualityResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string().optional(),
  timezone_abbreviation: z.string().optional(),
  current: z
    .object({
      time: z.string(),
      us_aqi: z.number().nullable().optional(),
      pm2_5: z.number().nullable().optional(),
      pm10: z.number().nullable().optional(),
      ozone: z.number().nullable().optional(),
      nitrogen_dioxide: z.number().nullable().optional(),
    })
    .optional(),
  hourly: z
    .object({
      time: z.array(z.string()),
      us_aqi: NullableNumberArray.optional(),
      pm2_5: NullableNumberArray.optional(),
      pm10: NullableNumberArray.optional(),
      ozone: NullableNumberArray.optional(),
      nitrogen_dioxide: NullableNumberArray.optional(),
    })
    .optional(),
});

export async function searchCities(query: string): Promise<LocationOption[]> {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const cacheKey = normalized.toLowerCase();
  const cached = geocodingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", normalized);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo Geocoding failed with HTTP ${response.status}`);
  }

  const raw = await response.json();
  const parsed = GeocodingResponseSchema.parse(raw);

  const locations: LocationOption[] = (parsed.results ?? []).map((item) => ({
    id: `om-${item.id}`,
    name: item.name,
    admin1: item.admin1,
    country: item.country ?? "Unknown",
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone ?? "auto",
    isPreset: false,
  }));

  geocodingCache.set(cacheKey, locations, GEOCODING_TTL_MS);
  return locations;
}

export async function fetchAirQuality(
  location: LocationOption,
  forceRefresh = false
): Promise<AirQualityReport> {
  const cacheKey = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;

  if (!forceRefresh) {
    const cached = airQualityCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
        },
      };
    }
  }

  const url = new URL(AIR_QUALITY_URL);
  url.searchParams.set("latitude", location.latitude.toString());
  url.searchParams.set("longitude", location.longitude.toString());
  url.searchParams.set(
    "current",
    "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide"
  );
  url.searchParams.set(
    "hourly",
    "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide"
  );
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");

  let response: Response | null = null;
  let lastFetchError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });
      break;
    } catch (err) {
      lastFetchError = err;
      if (attempt === 1) {
        throw lastFetchError;
      }
    }
  }

  if (!response) {
    throw lastFetchError instanceof Error
      ? lastFetchError
      : new Error("Open-Meteo Air Quality request failed");
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo Air Quality failed with HTTP ${response.status}`);
  }

  const raw = await response.json();
  const parsed = AirQualityResponseSchema.parse(raw);

  const hourlyTimes = parsed.hourly?.time ?? [];
  const hourlyPoints: HourlyPoint[] = hourlyTimes.map((time, index) => ({
    time,
    hourLabel: formatHourLabel(time),
    usAqi: parsed.hourly?.us_aqi?.[index] ?? null,
    pm25: parsed.hourly?.pm2_5?.[index] ?? null,
    pm10: parsed.hourly?.pm10?.[index] ?? null,
    ozone: parsed.hourly?.ozone?.[index] ?? null,
    nitrogenDioxide: parsed.hourly?.nitrogen_dioxide?.[index] ?? null,
  }));

  const observedAt =
    parsed.current?.time ??
    hourlyPoints[Math.floor(hourlyPoints.length / 2)]?.time ??
    new Date().toISOString();

  const { past24Hours, next24Hours } = splitPastAndForecast(hourlyPoints, observedAt);
  const lowerPollutionWindows = findLowerPollutionWindows(
    next24Hours,
    3,
    observedAt
  );

  const currentSnapshot = {
    observedAt,
    usAqi: parsed.current?.us_aqi ?? null,
    pm25: parsed.current?.pm2_5 ?? null,
    pm10: parsed.current?.pm10 ?? null,
    ozone: parsed.current?.ozone ?? null,
    nitrogenDioxide: parsed.current?.nitrogen_dioxide ?? null,
  };

  const missingMetrics: string[] = [];
  if (currentSnapshot.usAqi === null) missingMetrics.push("US AQI");
  if (currentSnapshot.pm25 === null) missingMetrics.push("PM2.5");
  if (currentSnapshot.pm10 === null) missingMetrics.push("PM10");
  if (currentSnapshot.ozone === null) missingMetrics.push("Ozone (O₃)");
  if (currentSnapshot.nitrogenDioxide === null) missingMetrics.push("NO₂");

  const report: AirQualityReport = {
    location: {
      ...location,
      timezone: parsed.timezone ?? location.timezone,
    },
    current: currentSnapshot,
    past24Hours,
    next24Hours,
    lowerPollutionWindows,
    metadata: {
      source: "Open-Meteo Air Quality API (CAMS Global Atmospheric Composition Model)",
      modelNotice:
        "Values are modelled atmospheric estimates and forecasts from Open-Meteo, not physical readings from CPCB or local ground monitoring stations.",
      fetchedAt: new Date().toISOString(),
      cached: false,
      timezoneAbbreviation: parsed.timezone_abbreviation,
      missingMetrics,
    },
  };

  airQualityCache.set(cacheKey, report, AIR_QUALITY_TTL_MS);
  return report;
}
