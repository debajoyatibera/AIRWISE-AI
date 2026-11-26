import { classifyUsAqi, formatMetricValue } from "./aqi";
import { formatLocationLabel } from "./locations";
import type {
  AirQualityReport,
  AssistantResponse,
  DailyPlanResponse,
  PlannerPreferences,
  PlannerRecommendation,
  UserProfileId,
} from "./types";

const PROFILE_LABELS: Record<UserProfileId, string> = {
  general_adult: "General adult",
  child_family: "Child or family",
  older_adult: "Older adult",
  respiratory_sensitive: "Respiratory-sensitive user",
  outdoor_worker: "Outdoor worker",
};

export function getProfileLabel(profile: UserProfileId): string {
  return PROFILE_LABELS[profile];
}

/**
 * Deterministic rule-based daily plan used when GEMINI_API_KEY is not configured
 * or when Gemini API calls fail. Clearly labelled as non-Gemini fallback.
 */
export function buildRuleBasedDailyPlan(
  report: AirQualityReport,
  preferences: PlannerPreferences,
  fallbackReason?: string
): DailyPlanResponse {
  const { current, lowerPollutionWindows } = report;
  const classification = classifyUsAqi(current.usAqi);
  const aqiText = formatMetricValue(current.usAqi, 0);
  const pm25Text = formatMetricValue(current.pm25, 1);
  const pm10Text = formatMetricValue(current.pm10, 1);
  const ozoneText = formatMetricValue(current.ozone, 1);
  const no2Text = formatMetricValue(current.nitrogenDioxide, 1);
  const locationLabel = formatLocationLabel(report.location);
  const profileLabel = getProfileLabel(preferences.profile);
  const isSensitiveProfile = preferences.profile !== "general_adult";
  const bestWindow = lowerPollutionWindows[0];

  const highCaution =
    classification.isUnhealthyOrWorse ||
    (isSensitiveProfile && (current.usAqi ?? 0) > 100);

  const windowSummary = bestWindow
    ? `${bestWindow.label} (forecast avg US AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}, PM2.5 ~${formatMetricValue(bestWindow.avgPm25, 1)} µg/m³)`
    : "No significantly lower-pollution forecast window identified; keep outdoor exposure brief.";

  const commuteAction = (() => {
    if (preferences.commutePreference === "walking_cycling" && highCaution) {
      return `Temporarily switch from walking or cycling to enclosed public transit or carpooling with cabin recirculation during "${preferences.schedule || "your commute"}" rather than breathing elevated roadside pollutants.`;
    }
    if (preferences.commutePreference === "remote_work") {
      return `Keep your remote-work setup indoors today and use the ${bestWindow ? bestWindow.label : "cleanest"} window for any essential local errands.`;
    }
    if (preferences.commutePreference === "private_vehicle") {
      return `Keep cabin windows closed in heavy traffic, enable air recirculation when behind diesel vehicles, and batch errands into one trip during ${preferences.schedule || "off-peak hours"}.`;
    }
    return `Prefer enclosed metro rail or AC public transit during ${preferences.schedule || "your main commute"}, and wait slightly back from idling kerbside buses or intersections.`;
  })();

  const recommendations: PlannerRecommendation[] = [
    {
      id: "plan-morning",
      section: "morning",
      title: "Morning Check & Routine Timing",
      whatToDo: highCaution
        ? `Keep early morning exertion light for a ${profileLabel.toLowerCase()} and shift "${preferences.outdoorActivity || "morning outdoor time"}" indoors or to ${bestWindow ? `the ${bestWindow.label} window` : "a cleaner period"}.`
        : `Proceed with normal morning routines (${preferences.schedule || "standard schedule"}), keeping vigorous exertion moderate if near busy intersections.`,
      whyRecommended:
        "Calm morning winds and cooler boundary layers often trap overnight combustion and dust particles close to street level.",
      supportingData: `Modelled current US AQI is ${aqiText} (${classification.category}), PM2.5 ${pm25Text} µg/m³, PM10 ${pm10Text} µg/m³ in ${locationLabel}.`,
      priority: highCaution ? "high" : "medium",
    },
    {
      id: "plan-outdoor",
      section: "outdoor",
      title: "Outdoor Activity Guidance",
      whatToDo: classification.isHazardous || classification.isVeryUnhealthyOrWorse
        ? `Move "${preferences.outdoorActivity || "outdoor activities"}" indoors today. Avoid strenuous outdoor exercise and take frequent indoor breaks if outdoor work is unavoidable.`
        : highCaution
          ? `Reduce intensity and duration of "${preferences.outdoorActivity || "outdoor activities"}"; choose shaded parks away from main roads and pause if any throat or eye irritation occurs.`
          : `You can schedule "${preferences.outdoorActivity || "outdoor activity"}" outdoors, prioritizing lower-traffic routes and monitoring how sensitive household members feel.`,
      whyRecommended: `Personalized for ${profileLabel}: deeper breathing during exertion increases the volume of fine particulates inhaled.`,
      supportingData: `Current modelled US AQI ${aqiText} (${classification.category}) and PM2.5 ${pm25Text} µg/m³.`,
      priority: highCaution ? "high" : "medium",
    },
    {
      id: "plan-windows",
      section: "windows",
      title: "Lower-Pollution Forecast Windows",
      whatToDo: bestWindow
        ? `Schedule essential outdoor errands, school pickups, or brief 10–15 minute home cross-ventilation during ${windowSummary}.`
        : "Keep outdoor errands consolidated and short while checking updated hourly forecasts for dispersion improvements.",
      whyRecommended:
        "Hourly atmospheric dispersion shifts throughout the day; aligning outdoor chores with cleaner forecast hours lowers cumulative exposure.",
      supportingData:
        lowerPollutionWindows.length > 0
          ? `Top forecast windows: ${lowerPollutionWindows
              .map((w) => `${w.label} (avg AQI ${formatMetricValue(w.avgUsAqi, 0)})`)
              .join("; ")}.`
          : `Derived from Open-Meteo next-24-hour forecast series for ${locationLabel}.`,
      priority: "high",
    },
    {
      id: "plan-commute",
      section: "commute",
      title: "Commuting Alternatives",
      whatToDo: commuteAction,
      whyRecommended:
        "Urban roadway corridors concentrate NO₂ and resuspended PM10 dust during peak rush hours.",
      supportingData: `Current modelled NO₂ is ${no2Text} µg/m³, PM10 is ${pm10Text} µg/m³, and commute preference is ${preferences.commutePreference.replace("_", " ")}.`,
      priority: highCaution ? "high" : "medium",
    },
    {
      id: "plan-indoor",
      section: "indoor",
      title: "Indoor Activity & Home Air Protection",
      whatToDo:
        "Run indoor workouts, reading, or family play indoors during higher-AQI hours; use kitchen exhaust fans while cooking and avoid indoor incense or smoke.",
      whyRecommended:
        "Keeping indoor air clean protects recovery time without sealing rooms permanently—ventilate briefly during cleaner forecast windows.",
      supportingData: `Outdoor PM2.5 ${pm25Text} µg/m³ and O₃ ${ozoneText} µg/m³ (${classification.category}).`,
      priority: highCaution ? "high" : "low",
    },
    {
      id: "plan-evening",
      section: "evening",
      title: "Evening Wind-Down & Recovery",
      whatToDo:
        "Wash hands and face after returning from outdoor travel, damp-wipe entry surfaces, and review tomorrow's hourly forecast before planning early-morning outdoor runs.",
      whyRecommended:
        "Evening traffic and cooling air can push particulate levels back up after sunset; preparing indoors supports cleaner overnight air.",
      supportingData: `Observed modelled timestamp: ${report.current.observedAt}; routine note considered: ${preferences.routineNote || "none provided"}.`,
      priority: "low",
    },
  ];

  const reasonSuffix = fallbackReason ? ` (${fallbackReason})` : "";

  return {
    mode: "rule-based-fallback",
    model: null,
    configuredModel: null,
    failoverUsed: false,
    notice: `Rule-based fallback active${reasonSuffix}. This plan was generated deterministically from retrieved Open-Meteo environmental estimates—not by Google Gemini.`,
    summary: `Daily plan for ${profileLabel} in ${locationLabel} based on modelled US AQI ${aqiText} (${classification.category}) and PM2.5 ${pm25Text} µg/m³. Best forecast window: ${windowSummary}.`,
    lowerPollutionWindows,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Deterministic rule-based Q&A fallback for Ask AIRWISE when Gemini is unavailable.
 */
export function buildRuleBasedAssistantAnswer(
  question: string,
  report: AirQualityReport,
  preferences: PlannerPreferences,
  fallbackReason?: string
): AssistantResponse {
  const { current, lowerPollutionWindows } = report;
  const classification = classifyUsAqi(current.usAqi);
  const aqiText = formatMetricValue(current.usAqi, 0);
  const pm25Text = formatMetricValue(current.pm25, 1);
  const pm10Text = formatMetricValue(current.pm10, 1);
  const ozoneText = formatMetricValue(current.ozone, 1);
  const no2Text = formatMetricValue(current.nitrogenDioxide, 1);
  const locationLabel = formatLocationLabel(report.location);
  const profileLabel = getProfileLabel(preferences.profile);
  const bestWindow = lowerPollutionWindows[0];
  const q = question.toLowerCase();

  let answer = "";
  let actionSteps: string[] = [];

  if (q.includes("pm2.5") || q.includes("pm 2.5") || q.includes("mean")) {
    answer = `PM2.5 refers to fine inhalable particulate matter 2.5 micrometers or smaller in diameter—roughly 30 times narrower than a human hair. In ${locationLabel}, the current modelled PM2.5 estimate is ${pm25Text} µg/m³ alongside a modelled US AQI of ${aqiText} (${classification.category}). Because fine particles travel deeper into airways than coarse dust, PM2.5 is one of the primary pollutants watched when planning outdoor exertion.`;
    actionSteps = [
      `Compare current PM2.5 (${pm25Text} µg/m³) against the WHO 24-hour guideline (15 µg/m³) as context, while noting Open-Meteo provides modelled estimates rather than ground-station readings.`,
      "Avoid indoor smoke (incense, cooking fumes) and damp-mop dust so indoor PM2.5 stays lower than outdoors.",
      bestWindow
        ? `Plan outdoor walks or brief ventilation during ${bestWindow.label} when modelled AQI dips toward ${formatMetricValue(bestWindow.avgUsAqi, 0)}.`
        : "Watch hourly forecast updates for cleaner dispersion windows.",
    ];
  } else if (q.includes("exercise") || q.includes("run") || q.includes("workout") || q.includes("jog")) {
    const safeForIntense =
      (current.usAqi ?? 999) <= 100 && preferences.profile === "general_adult";
    answer = safeForIntense
      ? `For a ${profileLabel.toLowerCase()} in ${locationLabel}, modelled US AQI is ${aqiText} (${classification.category}) with PM2.5 at ${pm25Text} µg/m³—moderate-intensity outdoor exercise is generally reasonable, especially away from main roads.`
      : `For a ${profileLabel.toLowerCase()} in ${locationLabel}, modelled US AQI is currently ${aqiText} (${classification.category}) with PM2.5 at ${pm25Text} µg/m³. Vigorous outdoor exercise is not advised right now; shift high-intensity workouts indoors or wait for a cleaner forecast window.`;
    actionSteps = [
      safeForIntense
        ? "Exercise in parks or low-traffic streets rather than beside busy arterial roads."
        : "Choose indoor bodyweight, yoga, treadmill, or strength workouts instead of heavy outdoor cardio.",
      bestWindow
        ? `If going outdoors later, target ${bestWindow.label} (avg AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}).`
        : "Keep any necessary outdoor activity short and low intensity.",
      "Stop outdoor exertion if you feel coughing, wheezing, or throat irritation.",
    ];
  } else if (q.includes("family") || q.includes("child") || q.includes("kids")) {
    answer = `In ${locationLabel}, modelled US AQI is ${aqiText} (${classification.category}) with PM2.5 at ${pm25Text} µg/m³ and PM10 at ${pm10Text} µg/m³. Families with children or older adults should tailor outdoor play and school travel around cleaner forecast hours rather than staying outdoors during peak traffic.`;
    actionSteps = [
      bestWindow
        ? `Plan outdoor family play or errands during the cleaner ${bestWindow.label} window (avg AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}).`
        : "Keep outdoor play light and indoors-oriented when AQI is elevated.",
      "Use enclosed transit or carpools for school drop-offs and turn off idling engines near school gates.",
      "Keep kitchen exhaust fans running during family meal prep and damp-mop floors to reduce tracked-in dust.",
    ];
  } else if (q.includes("indoor") || q.includes("home") || q.includes("window")) {
    answer = `With outdoor modelled US AQI at ${aqiText} (${classification.category}) and PM2.5 at ${pm25Text} µg/m³ in ${locationLabel}, the key to healthier indoor air is controlling indoor sources (cooking, incense, dust) and timing short cross-ventilation rather than sealing windows indefinitely.`;
    actionSteps = [
      bestWindow
        ? `Open opposite windows for 10–15 minutes of cross-ventilation during ${bestWindow.label} (avg AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}).`
        : "Ventilate briefly during the lowest-traffic midday period so indoor CO₂ does not accumulate.",
      "Run your kitchen exhaust fan while cooking and for 15 minutes afterward, and avoid burning incense or candles indoors.",
      "Use damp mopping instead of dry sweeping, and run a true-HEPA purifier if outdoor PM2.5 stays elevated.",
    ];
  } else if (q.includes("travel") || q.includes("commute") || q.includes("when")) {
    answer = bestWindow
      ? `Based on Open-Meteo's upcoming 24-hour forecast for ${locationLabel}, the cleanest modelled window for travel or errands is ${bestWindow.label} (average US AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}, PM2.5 ~${formatMetricValue(bestWindow.avgPm25, 1)} µg/m³), compared with ${aqiText} currently.`
      : `Current modelled US AQI in ${locationLabel} is ${aqiText} (${classification.category}) with NO₂ at ${no2Text} µg/m³. Prefer off-peak enclosed transit to reduce exposure to roadway exhaust.`;
    actionSteps = [
      bestWindow
        ? `Aim for ${bestWindow.label} when scheduling outdoor trips or combining errands.`
        : "Travel outside peak rush hours when roadway NO₂ typically spikes.",
      classification.isUnhealthyOrWorse
        ? "Avoid walking or cycling along busy roads while AQI is unhealthy; choose enclosed metro or bus transit."
        : "Choose metro, rail, or less-congested side streets where practical.",
      "Switch vehicle ventilation to recirculate when moving through slow traffic.",
    ];
  } else {
    answer = `In ${locationLabel}, Open-Meteo currently estimates US AQI at ${aqiText} (${classification.category}), with PM2.5 at ${pm25Text} µg/m³ and PM10 at ${pm10Text} µg/m³. For your ${profileLabel.toLowerCase()} profile, ${classification.summary.toLowerCase()}`;
    actionSteps = [
      bestWindow
        ? `Prioritize ${bestWindow.label} (avg AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}) for outdoor errands or brief ventilation.`
        : "Keep strenuous outdoor activity brief while monitoring hourly updates.",
      "Reduce indoor pollution sources by running exhaust fans while cooking and avoiding incense smoke.",
      "Choose enclosed public transit or carpooling when commuting through congested corridors.",
    ];
  }

  const reasonSuffix = fallbackReason ? ` (${fallbackReason})` : "";

  return {
    mode: "rule-based-fallback",
    model: null,
    configuredModel: null,
    failoverUsed: false,
    notice: `Rule-based fallback active${reasonSuffix}. This response was generated locally without Google Gemini.`,
    answer,
    keyFacts: [
      `Location: ${locationLabel}`,
      `Modelled US AQI: ${aqiText} (${classification.category})`,
      `PM2.5: ${pm25Text} µg/m³ | PM10: ${pm10Text} µg/m³`,
      `Ozone (O₃): ${ozoneText} µg/m³ | NO₂: ${no2Text} µg/m³`,
      bestWindow
        ? `Cleanest forecast window: ${bestWindow.label} (avg AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)})`
        : "Cleanest forecast window: Check hourly forecast table",
    ],
    actionSteps,
    dataUsed: [
      `Open-Meteo current estimate (${report.current.observedAt})`,
      `Open-Meteo next-24h hourly forecast (${report.next24Hours.length} points)`,
      `User profile: ${profileLabel}`,
    ],
    disclaimer:
      "AIRWISE AI provides environmental guidance using modelled Open-Meteo estimates (not physical CPCB station readings) and does not provide medical diagnosis or clinical advice.",
    generatedAt: new Date().toISOString(),
  };
}
