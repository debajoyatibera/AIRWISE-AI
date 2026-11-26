export interface LocationOption {
  id: string;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isPreset?: boolean;
}

export interface PollutantSnapshot {
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
}

export interface HourlyPoint extends PollutantSnapshot {
  time: string;
  hourLabel: string;
}

export interface PollutionWindow {
  startTime: string;
  endTime: string;
  label: string;
  avgUsAqi: number | null;
  maxUsAqi: number | null;
  avgPm25: number | null;
  category: string;
}

export interface AirQualityReport {
  location: LocationOption;
  current: PollutantSnapshot & {
    observedAt: string;
  };
  past24Hours: HourlyPoint[];
  next24Hours: HourlyPoint[];
  lowerPollutionWindows: PollutionWindow[];
  metadata: {
    source: string;
    modelNotice: string;
    fetchedAt: string;
    cached: boolean;
    timezoneAbbreviation?: string;
    missingMetrics?: string[];
  };
}

export type AqiLevel =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous"
  | "unavailable";

export interface AqiClassification {
  level: AqiLevel;
  category: string;
  shortLabel: string;
  accentHex: string;
  badgeClasses: string;
  summary: string;
  isUnhealthyOrWorse: boolean;
  isVeryUnhealthyOrWorse: boolean;
  isHazardous: boolean;
}

export type UserProfileId =
  | "general_adult"
  | "child_family"
  | "older_adult"
  | "respiratory_sensitive"
  | "outdoor_worker";

export type CommutePreference =
  | "public_transit"
  | "carpool_shared"
  | "private_vehicle"
  | "walking_cycling"
  | "remote_work";

export interface PlannerPreferences {
  profile: UserProfileId;
  schedule: string;
  outdoorActivity: string;
  commutePreference: CommutePreference;
  routineNote: string;
}

export type RecommendationSection =
  | "morning"
  | "outdoor"
  | "windows"
  | "commute"
  | "indoor"
  | "evening";

export type RecommendationPriority = "high" | "medium" | "low";

export interface PlannerRecommendation {
  id: string;
  section: RecommendationSection;
  title: string;
  whatToDo: string;
  whyRecommended: string;
  supportingData: string;
  priority: RecommendationPriority;
}

export interface DailyPlanResponse {
  mode: "gemini" | "rule-based-fallback";
  model: string | null;
  configuredModel: string | null;
  failoverUsed: boolean;
  notice: string;
  summary: string;
  lowerPollutionWindows: PollutionWindow[];
  recommendations: PlannerRecommendation[];
  generatedAt: string;
}

export interface AssistantResponse {
  mode: "gemini" | "rule-based-fallback";
  model: string | null;
  configuredModel: string | null;
  failoverUsed: boolean;
  notice: string;
  answer: string;
  keyFacts: string[];
  actionSteps: string[];
  dataUsed: string[];
  disclaimer: string;
  generatedAt: string;
}

export interface HealthStatus {
  status: "ok";
  geminiConfigured: boolean;
  activeMode: "gemini" | "rule-based-fallback";
  configuredModel: string | null;
  fallbackModels: string[];
  failoverEnabled: boolean;
  lastUsedModel: string | null;
  lastFailoverAt: string | null;
}

export interface IndoorGuidanceItem {
  id: string;
  topic:
    | "ventilation"
    | "dust_reduction"
    | "cooking_emissions"
    | "exhaust_fan"
    | "hepa_filtration"
    | "smoke_incense"
    | "prevention";
  title: string;
  statusLabel: string;
  whatToDo: string;
  whyRecommended: string;
  supportingData: string;
  priority: RecommendationPriority;
}

export interface EcoActionItem {
  id: string;
  category:
    | "public_transit"
    | "carpooling"
    | "anti_idling"
    | "errand_combining"
    | "commute_choice"
    | "household_practice";
  title: string;
  whatToDo: string;
  environmentalBenefit: string;
  airSafetyGuard: string;
  supportingData: string;
  priority: RecommendationPriority;
  safeNow: boolean;
}
