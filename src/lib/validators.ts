import { z } from "zod";

export const UserProfileSchema = z.enum([
  "general_adult",
  "child_family",
  "older_adult",
  "respiratory_sensitive",
  "outdoor_worker",
]);

export const CommutePreferenceSchema = z.enum([
  "public_transit",
  "carpool_shared",
  "private_vehicle",
  "walking_cycling",
  "remote_work",
]);

export const PlannerPreferencesSchema = z.object({
  profile: UserProfileSchema,
  schedule: z.string().trim().max(200).default("09:00–18:00 workday"),
  outdoorActivity: z.string().trim().max(200).default("Evening walk or light exercise"),
  commutePreference: CommutePreferenceSchema.default("public_transit"),
  routineNote: z.string().trim().max(300).default(""),
});

export const LocationSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  admin1: z.string().max(120).optional(),
  country: z.string().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).max(80),
  isPreset: z.boolean().optional(),
});

const PollutantSnapshotSchema = z.object({
  usAqi: z.number().nullable(),
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  ozone: z.number().nullable(),
  nitrogenDioxide: z.number().nullable(),
});

const HourlyPointSchema = PollutantSnapshotSchema.extend({
  time: z.string(),
  hourLabel: z.string(),
});

const PollutionWindowSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  label: z.string(),
  avgUsAqi: z.number().nullable(),
  maxUsAqi: z.number().nullable(),
  avgPm25: z.number().nullable(),
  category: z.string(),
});

export const AirQualityReportSchema = z.object({
  location: LocationSchema,
  current: PollutantSnapshotSchema.extend({
    observedAt: z.string(),
  }),
  past24Hours: z.array(HourlyPointSchema).max(48),
  next24Hours: z.array(HourlyPointSchema).max(48),
  lowerPollutionWindows: z.array(PollutionWindowSchema).max(6),
  metadata: z.object({
    source: z.string(),
    modelNotice: z.string(),
    fetchedAt: z.string(),
    cached: z.boolean(),
    timezoneAbbreviation: z.string().optional(),
    missingMetrics: z.array(z.string()).optional(),
  }),
});

export const PlanRequestSchema = z.object({
  report: AirQualityReportSchema,
  preferences: PlannerPreferencesSchema,
});

export const AssistantRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Please enter a question of at least 3 characters.")
    .max(600, "Question must be 600 characters or fewer."),
  report: AirQualityReportSchema,
  preferences: PlannerPreferencesSchema,
});
