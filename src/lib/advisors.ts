import { classifyUsAqi, formatMetricValue } from "./aqi";
import type { AirQualityReport, EcoActionItem, IndoorGuidanceItem } from "./types";

/**
 * Generates personalized household indoor air quality guidance grounded in
 * current Open-Meteo outdoor estimates and upcoming lower-pollution windows.
 * Never recommends keeping windows closed indefinitely.
 */
export function buildIndoorGuidance(report: AirQualityReport): IndoorGuidanceItem[] {
  const { current, lowerPollutionWindows } = report;
  const classification = classifyUsAqi(current.usAqi);
  const bestWindow = lowerPollutionWindows[0];
  const aqiText = formatMetricValue(current.usAqi, 0);
  const pm25Text = formatMetricValue(current.pm25, 1);
  const pm10Text = formatMetricValue(current.pm10, 1);
  const no2Text = formatMetricValue(current.nitrogenDioxide, 1);

  const windowPhrase = bestWindow
    ? `Target the ${bestWindow.label} forecast window (avg US AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}) for 10–15 minutes of cross-ventilation.`
    : "Open opposite windows briefly (10–15 minutes) during the cleanest daytime or midday dispersion period rather than sealing rooms all day.";

  const ventilationStatus =
    current.usAqi !== null && current.usAqi <= 100
      ? "Open with timing awareness"
      : "Timed short ventilation";

  const ventilationAction =
    current.usAqi !== null && current.usAqi <= 100
      ? `Ventilate living areas naturally now and ${windowPhrase.toLowerCase()} Avoid keeping windows sealed continuously so indoor CO₂ and cooking moisture do not build up.`
      : `Keep street-facing windows mostly closed during peak traffic/haze hours, and schedule brief 10–15 minute cross-ventilation during cleaner hours instead of keeping windows closed indefinitely. ${windowPhrase}`;

  const hepaPriority =
    classification.isUnhealthyOrWorse || (current.pm25 ?? 0) >= 35
      ? "high"
      : (current.usAqi ?? 0) > 50
        ? "medium"
        : "low";

  return [
    {
      id: "indoor-ventilation",
      topic: "ventilation",
      title: "Timed Ventilation Decisions",
      statusLabel: ventilationStatus,
      whatToDo: ventilationAction,
      whyRecommended:
        "Balanced air exchange prevents stale indoor CO₂, humidity, and cooking pollutants from accumulating while limiting fine-particle ingress during high-AQI hours.",
      supportingData: `Current modelled US AQI: ${aqiText} (${classification.category}), PM2.5: ${pm25Text} µg/m³${bestWindow ? `, cleanest forecast window: ${bestWindow.label}` : ""}.`,
      priority: (current.usAqi ?? 0) > 100 ? "high" : "medium",
    },
    {
      id: "indoor-cooking",
      topic: "cooking_emissions",
      title: "Cooking Emissions Control",
      statusLabel: "Run before & after cooking",
      whatToDo:
        "Cover pots and pans with lids, keep cooking oils below their smoke point, and close interior doors connecting the kitchen to bedrooms during high-heat frying or tadka.",
      whyRecommended:
        "High-temperature frying and gas combustion release concentrated indoor PM2.5 and NO₂ bursts that linger longer when outdoor air is already polluted.",
      supportingData: `Current outdoor PM2.5 is ${pm25Text} µg/m³ and NO₂ is ${no2Text} µg/m³; keeping indoor cooking spikes low prevents compounding exposure.`,
      priority: "high",
    },
    {
      id: "indoor-exhaust",
      topic: "exhaust_fan",
      title: "Exhaust Fan Usage",
      statusLabel: "Active during & 15m after",
      whatToDo:
        "Turn on your kitchen chimney or exhaust fan before lighting the stove and keep it running 10–15 minutes after cooking finishes; confirm it vents outdoors rather than recirculating.",
      whyRecommended:
        "Point-source extraction removes steam, ultrafine cooking aerosols, and combustion gases before they disperse throughout the home.",
      supportingData: `Outdoor NO₂: ${no2Text} µg/m³, PM2.5: ${pm25Text} µg/m³ (${classification.category}).`,
      priority: "high",
    },
    {
      id: "indoor-hepa",
      topic: "hepa_filtration",
      title: "HEPA Filtration Strategy",
      statusLabel:
        hepaPriority === "high" ? "Run continuously in main room" : "Targeted room use",
      whatToDo:
        hepaPriority === "high"
          ? "Run a true-HEPA air purifier continuously on medium or auto mode in occupied bedrooms/living spaces, keeping doors partially closed to maintain clean-air delivery rate."
          : "Use a true-HEPA purifier in bedrooms overnight or when cooking/cleaning dust rises; inspect pre-filters weekly for trapped urban dust.",
      whyRecommended:
        "True-HEPA media captures fine particulate matter (PM2.5) without generating ozone, unlike uncertified ionizers.",
      supportingData: `Modelled PM2.5 is ${pm25Text} µg/m³ and PM10 is ${pm10Text} µg/m³.`,
      priority: hepaPriority,
    },
    {
      id: "indoor-dust",
      topic: "dust_reduction",
      title: "Indoor Dust Reduction",
      statusLabel: "Wet wipe & damp mop",
      whatToDo:
        "Use a damp microfiber cloth and wet mop instead of dry brooms or feather dusters; vacuum carpets and upholstery with a HEPA-filtered vacuum if available.",
      whyRecommended:
        "Dry sweeping kicks settled PM10 road dust back into breathing height, whereas damp cleaning captures particles cleanly.",
      supportingData: `Current modelled PM10 is ${pm10Text} µg/m³ (${classification.category}).`,
      priority: (current.pm10 ?? 0) >= 50 ? "high" : "medium",
    },
    {
      id: "indoor-smoke",
      topic: "smoke_incense",
      title: "Smoke & Incense Reduction",
      statusLabel: "Minimize indoor combustion",
      whatToDo:
        "Avoid burning incense sticks (agarbatti), dhoop, scented candles, mosquito coils, or tobacco indoors; opt for electric diffusers without smoke or window screens for mosquitoes.",
      whyRecommended:
        "Indoor smoldering sources rapidly elevate indoor PM2.5 concentrations inside closed or semi-closed rooms.",
      supportingData: `Outdoor PM2.5 (${pm25Text} µg/m³) already limits how fast indoor smoke can safely dilute.`,
      priority: (current.pm25 ?? 0) >= 25 ? "high" : "medium",
    },
    {
      id: "indoor-prevention",
      topic: "prevention",
      title: "Household Pollution Prevention",
      statusLabel: "Entryway & low-VOC habits",
      whatToDo:
        "Leave outdoor footwear at the entryway on a washable mat, store paints/solvents sealed outside living spaces, and choose fragrance-free, low-VOC household cleaners.",
      whyRecommended:
        "Preventing outdoor dust track-in and minimizing volatile chemical vapors keeps baseline indoor air cleaner between ventilation cycles.",
      supportingData: `Location baseline: ${report.location.name} modelled US AQI ${aqiText} (${classification.category}).`,
      priority: "low",
    },
  ];
}

/**
 * Generates responsible daily Eco Actions with strict air-quality safety guards:
 * never recommends outdoor walking or cycling in unhealthy/hazardous pollution merely to cut emissions.
 */
export function buildEcoActions(report: AirQualityReport): EcoActionItem[] {
  const { current, lowerPollutionWindows } = report;
  const classification = classifyUsAqi(current.usAqi);
  const aqiText = formatMetricValue(current.usAqi, 0);
  const no2Text = formatMetricValue(current.nitrogenDioxide, 1);
  const pm25Text = formatMetricValue(current.pm25, 1);
  const bestWindow = lowerPollutionWindows[0];

  const unsafeForActiveTravel =
    classification.isUnhealthyOrWorse || (current.usAqi ?? 0) > 150;
  const sensitiveCaution = (current.usAqi ?? 0) > 100 && !unsafeForActiveTravel;

  const activeTravelTitle = unsafeForActiveTravel
    ? "Enclosed Low-Emission Transit (Pause Outdoor Walking/Cycling)"
    : sensitiveCaution
      ? "Short Walk or Cycle Only in Cleaner Window; Prefer Enclosed Transit"
      : "Walk or Cycle Short Trips in Cleaner Hours";

  const activeTravelAction = unsafeForActiveTravel
    ? `Do NOT walk or cycle outdoors right now just to reduce emissions—choose enclosed electric metro, AC bus, or postpone non-essential trips while modelled US AQI is ${aqiText} (${classification.category}).`
    : sensitiveCaution
      ? `Limit outdoor walking or cycling to short, low-effort errands during ${bestWindow ? `the ${bestWindow.label} window` : "lower-pollution hours"}; otherwise use enclosed public transit.`
      : `For short neighborhood trips under 2–3 km, walk or cycle along tree-lined side streets away from arterial traffic, ideally around ${bestWindow ? bestWindow.label : "off-peak hours"}.`;

  const activeTravelSafetyGuard = unsafeForActiveTravel
    ? "Safety override active: AIRWISE never recommends outdoor walking or cycling in Unhealthy, Very Unhealthy, or Hazardous air conditions."
    : sensitiveCaution
      ? "Caution for sensitive groups: switch to enclosed transit if breathing feels strained or AQI rises above 150."
      : "Safe for general adults at current modelled AQI; avoid high-traffic arterial roads.";

  return [
    {
      id: "eco-public-transit",
      category: "public_transit",
      title: "Choose Public Transportation",
      whatToDo:
        "Use metro rail, suburban trains, or electric/CNG buses instead of single-occupancy cars or two-wheelers for daily commutes.",
      environmentalBenefit:
        "Sharing high-capacity transit lowers per-person tailpipe emissions of nitrogen oxides, particulate precursors, and urban road congestion.",
      airSafetyGuard:
        "Enclosed metro/rail also reduces personal inhalation of roadside exhaust compared with open-air two-wheelers.",
      supportingData: `Current modelled NO₂ is ${no2Text} µg/m³ and US AQI is ${aqiText}.`,
      priority: "high",
      safeNow: true,
    },
    {
      id: "eco-carpool",
      category: "carpooling",
      title: "Carpool or Share Rides",
      whatToDo:
        "Coordinate shared commutes with colleagues, neighbors, or school carpools when public transit does not cover your route.",
      environmentalBenefit:
        "Consolidating solo vehicle trips removes redundant vehicles from peak-hour bottlenecks, reducing overall fuel burn and brake/tire dust.",
      airSafetyGuard:
        "Use cabin air recirculation mode while passing heavy diesel traffic corridors.",
      supportingData: `Modelled PM10 road/coarse dust indicator: ${formatMetricValue(current.pm10, 1)} µg/m³; NO₂: ${no2Text} µg/m³.`,
      priority: "medium",
      safeNow: true,
    },
    {
      id: "eco-anti-idling",
      category: "anti_idling",
      title: "Eliminate Unnecessary Vehicle Idling",
      whatToDo:
        "Switch off your vehicle engine at long traffic signals (over 30–60 seconds), railway crossings, and while waiting for school or office pickups.",
      environmentalBenefit:
        "Avoiding stationary idling cuts wasted fuel and prevents localized exhaust plumes of NO₂ and fine particulates near sidewalks and school gates.",
      airSafetyGuard:
        "Protects pedestrians, students, and traffic workers standing right beside stationary tailpipes.",
      supportingData: `Current modelled urban NO₂: ${no2Text} µg/m³, PM2.5: ${pm25Text} µg/m³.`,
      priority: "high",
      safeNow: true,
    },
    {
      id: "eco-errands",
      category: "errand_combining",
      title: "Combine Errands & Off-Peak Scheduling",
      whatToDo:
        "Batch grocery, pharmacy, and pickup errands into a single planned route during off-peak traffic hours—or shift eligible tasks online.",
      environmentalBenefit:
        "Fewer cold engine starts and less stop-and-go driving reduce cumulative urban exhaust and roadway dust resuspension.",
      airSafetyGuard: bestWindow
        ? `Align essential outdoor errands with the lower-pollution ${bestWindow.label} window (avg AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}).`
        : "Minimizes total time spent exposed to urban roadway pollution.",
      supportingData: `Modelled US AQI: ${aqiText} (${classification.category}).`,
      priority: "medium",
      safeNow: true,
    },
    {
      id: "eco-active-travel",
      category: "commute_choice",
      title: activeTravelTitle,
      whatToDo: activeTravelAction,
      environmentalBenefit:
        unsafeForActiveTravel
          ? "Using electric/shared transit or working remotely avoids adding tailpipe emissions without exposing lungs to elevated pollution."
          : "Replacing short motorized trips with human-powered travel eliminates tailpipe exhaust on neighborhood streets.",
      airSafetyGuard: activeTravelSafetyGuard,
      supportingData: `Current modelled US AQI: ${aqiText} (${classification.category}), PM2.5: ${pm25Text} µg/m³.`,
      priority: unsafeForActiveTravel ? "high" : "medium",
      safeNow: !unsafeForActiveTravel,
    },
    {
      id: "eco-household",
      category: "household_practice",
      title: "Zero Open Burning & Clean Household Energy",
      whatToDo:
        "Never burn garden leaves, packaging, or household waste outdoors; compost organics, maintain clean cooking appliances, and run high-draw appliances efficiently.",
      environmentalBenefit:
        "Eliminating open biomass and waste burning directly prevents dense local smoke plumes of PM2.5 and toxic soot in residential neighborhoods.",
      airSafetyGuard:
        "Keeps immediate neighborhood air cleaner for children, older adults, and neighboring households.",
      supportingData: `Local baseline PM2.5: ${pm25Text} µg/m³ in ${report.location.name}.`,
      priority: "high",
      safeNow: true,
    },
  ];
}
