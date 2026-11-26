import type {
  AqiClassification,
  HourlyPoint,
  PollutantSnapshot,
  PollutionWindow,
} from "./types";

/**
 * Classifies a numeric US AQI value into standard EPA air-quality categories
 * with accessible UI tokens and safety flags.
 */
export function classifyUsAqi(aqi: number | null | undefined): AqiClassification {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) {
    return {
      level: "unavailable",
      category: "Unavailable",
      shortLabel: "N/A",
      accentHex: "#64748B",
      badgeClasses: "bg-slate-500/15 text-slate-200 border-slate-400/30",
      summary:
        "Current US AQI estimate is unavailable from the model response. Check individual pollutant readings or retry.",
      isUnhealthyOrWorse: false,
      isVeryUnhealthyOrWorse: false,
      isHazardous: false,
    };
  }

  const rounded = Math.round(aqi);

  if (rounded <= 50) {
    return {
      level: "good",
      category: "Good",
      shortLabel: "Good",
      accentHex: "#14B8A6",
      badgeClasses: "bg-teal-500/15 text-teal-200 border-teal-400/40",
      summary:
        "Modelled air quality is satisfactory with minimal expected risk for most daily activities.",
      isUnhealthyOrWorse: false,
      isVeryUnhealthyOrWorse: false,
      isHazardous: false,
    };
  }

  if (rounded <= 100) {
    return {
      level: "moderate",
      category: "Moderate",
      shortLabel: "Moderate",
      accentHex: "#F59E0B",
      badgeClasses: "bg-amber-500/15 text-amber-200 border-amber-400/40",
      summary:
        "Modelled air quality is acceptable, though unusually sensitive individuals may notice mild irritation during prolonged exertion.",
      isUnhealthyOrWorse: false,
      isVeryUnhealthyOrWorse: false,
      isHazardous: false,
    };
  }

  if (rounded <= 150) {
    return {
      level: "sensitive",
      category: "Unhealthy for Sensitive Groups",
      shortLabel: "Sensitive",
      accentHex: "#F97316",
      badgeClasses: "bg-orange-500/15 text-orange-200 border-orange-400/40",
      summary:
        "Children, older adults, outdoor workers, and respiratory-sensitive people should limit prolonged or heavy outdoor exertion.",
      isUnhealthyOrWorse: false,
      isVeryUnhealthyOrWorse: false,
      isHazardous: false,
    };
  }

  if (rounded <= 200) {
    return {
      level: "unhealthy",
      category: "Unhealthy",
      shortLabel: "Unhealthy",
      accentHex: "#EF4444",
      badgeClasses: "bg-red-500/15 text-red-200 border-red-400/40",
      summary:
        "Everyone may begin to experience irritation from prolonged outdoor exposure; shift vigorous workouts indoors.",
      isUnhealthyOrWorse: true,
      isVeryUnhealthyOrWorse: false,
      isHazardous: false,
    };
  }

  if (rounded <= 300) {
    return {
      level: "very_unhealthy",
      category: "Very Unhealthy",
      shortLabel: "Very Unhealthy",
      accentHex: "#A855F7",
      badgeClasses: "bg-purple-500/15 text-purple-200 border-purple-400/40",
      summary:
        "Elevated health caution: avoid strenuous outdoor activity and prioritize cleaner indoor air spaces.",
      isUnhealthyOrWorse: true,
      isVeryUnhealthyOrWorse: true,
      isHazardous: false,
    };
  }

  return {
    level: "hazardous",
    category: "Hazardous",
    shortLabel: "Hazardous",
    accentHex: "#DC2626",
    badgeClasses: "bg-rose-900/50 text-rose-100 border-rose-500/50",
    summary:
      "Severe modelled air pollution: remain indoors as much as practical and avoid outdoor physical exertion.",
    isUnhealthyOrWorse: true,
    isVeryUnhealthyOrWorse: true,
    isHazardous: true,
  };
}

export interface PollutantMeta {
  key: keyof PollutantSnapshot;
  label: string;
  unit: string;
  description: string;
  thresholdNote: string;
}

export const POLLUTANT_META: Record<keyof PollutantSnapshot, PollutantMeta> = {
  usAqi: {
    key: "usAqi",
    label: "US AQI",
    unit: "Index",
    description:
      "Composite US EPA Air Quality Index scale combining key pollutants to indicate daily outdoor exposure caution.",
    thresholdNote: "0–50 Good, 51–100 Moderate, 101–150 Sensitive, 151+ Unhealthy",
  },
  pm25: {
    key: "pm25",
    label: "PM2.5",
    unit: "µg/m³",
    description:
      "Fine inhalable particles (2.5 micrometers or smaller) from combustion, traffic, dust, and secondary aerosols.",
    thresholdNote: "WHO 24-hour guideline: 15 µg/m³",
  },
  pm10: {
    key: "pm10",
    label: "PM10",
    unit: "µg/m³",
    description:
      "Coarser particulate matter (10 micrometers or smaller) such as road dust, construction dust, and pollen.",
    thresholdNote: "WHO 24-hour guideline: 45 µg/m³",
  },
  ozone: {
    key: "ozone",
    label: "Ozone (O₃)",
    unit: "µg/m³",
    description:
      "Ground-level ozone formed when sunlight reacts with traffic and industrial emissions, often peaking in afternoon hours.",
    thresholdNote: "WHO 8-hour guideline: 100 µg/m³",
  },
  nitrogenDioxide: {
    key: "nitrogenDioxide",
    label: "Nitrogen Dioxide (NO₂)",
    unit: "µg/m³",
    description:
      "Traffic- and combustion-related gas commonly elevated along congested urban roadways and peak commute periods.",
    thresholdNote: "WHO 24-hour guideline: 25 µg/m³",
  },
};

export function formatMetricValue(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }
  return decimals === 0 ? `${Math.round(value)}` : value.toFixed(decimals);
}

/**
 * Formats an Open-Meteo local ISO timestamp (e.g. "2026-11-26T14:00") into
 * a compact, readable hour label like "14:00".
 */
export function formatHourLabel(isoTime: string): string {
  const timePart = isoTime.split("T")[1];
  if (!timePart) return isoTime;
  return timePart.slice(0, 5);
}

/**
 * Splits a continuous hourly series into the trailing 24 hours up to observedAt
 * and the upcoming 24 forecast hours strictly at or after observedAt.
 */
export function splitPastAndForecast(
  hourly: HourlyPoint[],
  observedAt: string
): { past24Hours: HourlyPoint[]; next24Hours: HourlyPoint[] } {
  if (hourly.length === 0) {
    return { past24Hours: [], next24Hours: [] };
  }

  const targetHourKey = observedAt.slice(0, 13); // "YYYY-MM-DDTHH"
  const currentIndex = hourly.findIndex(
    (point) => point.time.slice(0, 13) >= targetHourKey
  );

  if (currentIndex === -1) {
    return {
      past24Hours: hourly.slice(-24),
      next24Hours: [],
    };
  }

  // For half-hour timezones (e.g. Asia/Kolkata at 23:30), past includes 23:00
  // while future forecast starts at the next full hour (00:00).
  const observedMinutes = Number(observedAt.slice(14, 16) || "0");
  const forecastStart =
    observedMinutes > 0 && currentIndex + 1 < hourly.length
      ? currentIndex + 1
      : currentIndex;

  const pastStart = Math.max(0, currentIndex - 23);
  const past24Hours = hourly.slice(pastStart, currentIndex + 1);
  const next24Hours = hourly.slice(forecastStart, forecastStart + 24);

  return { past24Hours, next24Hours };
}

/**
 * Identifies the lowest-AQI 2-hour contiguous windows in the upcoming 24-hour forecast.
 * Includes a day prefix when observedAt is provided and the window starts on a different date.
 */
export function findLowerPollutionWindows(
  next24Hours: HourlyPoint[],
  maxWindows = 3,
  observedAt?: string
): PollutionWindow[] {
  if (next24Hours.length < 2) {
    return [];
  }

  const observedDate = observedAt?.slice(0, 10);
  const candidates: Array<PollutionWindow & { score: number; startIndex: number }> = [];

  for (let i = 0; i <= next24Hours.length - 2; i++) {
    const slice = next24Hours.slice(i, i + 2);
    const aqiValues = slice
      .map((p) => p.usAqi)
      .filter((v): v is number => v !== null && !Number.isNaN(v));
    const pm25Values = slice
      .map((p) => p.pm25)
      .filter((v): v is number => v !== null && !Number.isNaN(v));

    if (aqiValues.length === 0 && pm25Values.length === 0) {
      continue;
    }

    const avgUsAqi =
      aqiValues.length > 0
        ? Math.round(aqiValues.reduce((sum, v) => sum + v, 0) / aqiValues.length)
        : null;
    const maxUsAqi = aqiValues.length > 0 ? Math.round(Math.max(...aqiValues)) : null;
    const avgPm25 =
      pm25Values.length > 0
        ? Number(
            (pm25Values.reduce((sum, v) => sum + v, 0) / pm25Values.length).toFixed(1)
          )
        : null;

    const score = avgUsAqi ?? (avgPm25 !== null ? avgPm25 * 2 : Number.MAX_SAFE_INTEGER);
    const startLabel = formatHourLabel(slice[0].time);
    const endLabel = formatHourLabel(slice[slice.length - 1].time);
    const startDate = slice[0].time.slice(0, 10);
    const dayPrefix =
      observedDate && startDate !== observedDate
        ? `${startDate.slice(5)} · `
        : "";
    const classification = classifyUsAqi(avgUsAqi);

    candidates.push({
      startTime: slice[0].time,
      endTime: slice[slice.length - 1].time,
      label: `${dayPrefix}${startLabel} – ${endLabel}`,
      avgUsAqi,
      maxUsAqi,
      avgPm25,
      category: classification.category,
      score,
      startIndex: i,
    });
  }

  candidates.sort((a, b) => a.score - b.score || a.startIndex - b.startIndex);

  const selected: PollutionWindow[] = [];
  const usedIndices: number[] = [];

  for (const candidate of candidates) {
    const overlaps = usedIndices.some((idx) => Math.abs(idx - candidate.startIndex) < 2);
    if (overlaps) continue;
    usedIndices.push(candidate.startIndex);
    selected.push({
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      label: candidate.label,
      avgUsAqi: candidate.avgUsAqi,
      maxUsAqi: candidate.maxUsAqi,
      avgPm25: candidate.avgPm25,
      category: candidate.category,
    });
    if (selected.length >= maxWindows) break;
  }

  return selected;
}
