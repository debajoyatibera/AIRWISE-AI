import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { classifyUsAqi, formatMetricValue } from "./aqi";
import {
  buildRuleBasedAssistantAnswer,
  buildRuleBasedDailyPlan,
  getProfileLabel,
} from "./fallback-ai";
import { formatLocationLabel } from "./locations";
import type {
  AirQualityReport,
  AssistantResponse,
  DailyPlanResponse,
  HealthStatus,
  PlannerPreferences,
} from "./types";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const GEMINI_REQUEST_TIMEOUT_MS = 15_000;

let lastUsedModel: string | null = null;
let lastFailoverAt: string | null = null;

const GeminiPlanOutputSchema = z.object({
  summary: z.string().min(10),
  recommendations: z
    .array(
      z.object({
        id: z.string().min(1),
        section: z.enum([
          "morning",
          "outdoor",
          "windows",
          "commute",
          "indoor",
          "evening",
        ]),
        title: z.string().min(2),
        whatToDo: z.string().min(5),
        whyRecommended: z.string().min(5),
        supportingData: z.string().min(5),
        priority: z.enum(["high", "medium", "low"]),
      })
    )
    .min(4)
    .max(8),
});

const GeminiAssistantOutputSchema = z.object({
  answer: z.string().min(10),
  keyFacts: z.array(z.string()).min(1).max(6),
  actionSteps: z.array(z.string()).min(1).max(6),
  dataUsed: z.array(z.string()).min(1).max(6),
});

function getGeminiConfig(): { apiKey: string | null; model: string } {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || null;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return { apiKey, model };
}

export function getGeminiHealthStatus(): HealthStatus {
  const { apiKey, model } = getGeminiConfig();
  const geminiConfigured = Boolean(apiKey);
  const fallbackModels = GEMINI_FALLBACK_MODELS.filter((m) => m !== model);

  return {
    status: "ok",
    geminiConfigured,
    activeMode: geminiConfigured ? "gemini" : "rule-based-fallback",
    configuredModel: geminiConfigured ? model : null,
    fallbackModels: geminiConfigured ? fallbackModels : [],
    failoverEnabled: geminiConfigured && fallbackModels.length > 0,
    lastUsedModel: geminiConfigured ? lastUsedModel : null,
    lastFailoverAt: geminiConfigured ? lastFailoverAt : null,
  };
}

function parseGeminiJson(rawText: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callGeminiWithModelFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  contents: string,
  systemInstruction: string
): Promise<{ text: string; usedModel: string; fallbackFrom: string | null }> {
  const candidates = [
    primaryModel,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const candidateModel = candidates[i];
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.3,
          abortSignal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
        },
      });
      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error(`Empty response from ${candidateModel}`);
      }
      lastUsedModel = candidateModel;
      if (i > 0) {
        lastFailoverAt = new Date().toISOString();
      }
      return {
        text: rawText,
        usedModel: candidateModel,
        fallbackFrom: i === 0 ? null : primaryModel,
      };
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "";
      const isModelOrCapacityError =
        name === "TimeoutError" ||
        name === "AbortError" ||
        msg.includes("503") ||
        msg.includes("429") ||
        msg.includes("404") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.toLowerCase().includes("timeout") ||
        msg.toLowerCase().includes("aborted");

      if (!isModelOrCapacityError || i === candidates.length - 1) {
        throw error;
      }
      console.warn(
        `[AIRWISE] Gemini model ${candidateModel} unavailable (${msg.slice(0, 100)}), trying next Gemini model...`
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Gemini candidate models failed");
}

function buildEnvironmentalContextText(
  report: AirQualityReport,
  preferences: PlannerPreferences
): string {
  const classification = classifyUsAqi(report.current.usAqi);
  const windowsText =
    report.lowerPollutionWindows.length > 0
      ? report.lowerPollutionWindows
          .map(
            (w) =>
              `${w.label} (avg US AQI: ${formatMetricValue(w.avgUsAqi, 0)}, max US AQI: ${formatMetricValue(w.maxUsAqi, 0)}, avg PM2.5: ${formatMetricValue(w.avgPm25, 1)} µg/m³)`
          )
          .join("; ")
      : "None identified";

  const hourlyPreview = report.next24Hours
    .slice(0, 12)
    .map(
      (h) =>
        `${h.hourLabel}: AQI=${formatMetricValue(h.usAqi, 0)}, PM2.5=${formatMetricValue(h.pm25, 1)}`
    )
    .join(" | ");

  return JSON.stringify(
    {
      location: formatLocationLabel(report.location),
      sourceNotice:
        "Open-Meteo modelled atmospheric estimates and forecasts (NOT physical CPCB monitoring station readings).",
      observedAt: report.current.observedAt,
      currentEstimate: {
        usAqi: report.current.usAqi,
        usAqiCategory: classification.category,
        pm25_ugm3: report.current.pm25,
        pm10_ugm3: report.current.pm10,
        ozone_ugm3: report.current.ozone,
        nitrogenDioxide_ugm3: report.current.nitrogenDioxide,
      },
      lowerPollutionForecastWindows: windowsText,
      next12HoursForecastPreview: hourlyPreview,
      userPreferences: {
        profile: getProfileLabel(preferences.profile),
        schedule: preferences.schedule,
        outdoorActivity: preferences.outdoorActivity,
        commutePreference: preferences.commutePreference,
        routineNote: preferences.routineNote,
      },
    },
    null,
    2
  );
}

export async function generateDailyPlan(
  report: AirQualityReport,
  preferences: PlannerPreferences
): Promise<DailyPlanResponse> {
  const { apiKey, model } = getGeminiConfig();

  if (!apiKey) {
    return buildRuleBasedDailyPlan(report, preferences, "GEMINI_API_KEY not configured");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contextJson = buildEnvironmentalContextText(report, preferences);

    const systemInstruction = [
      "You are AIRWISE AI, an urban air-quality planning assistant.",
      "Generate a practical, accurate daily plan grounded strictly in the provided Open-Meteo environmental context and user preferences.",
      "RULES:",
      "1. Never invent pollution numbers, station readings, or carbon savings.",
      "2. Never claim these values are official CPCB ground monitoring-station readings; treat them accurately as Open-Meteo modelled estimates and forecasts.",
      "3. Never provide medical diagnosis or unsupported clinical/medical claims.",
      "4. Never recommend keeping windows closed indefinitely; recommend brief timed cross-ventilation in cleaner windows.",
      "5. Never recommend outdoor walking or cycling in Unhealthy, Very Unhealthy, or Hazardous AQI (US AQI >= 151) merely to reduce emissions.",
      "6. Include recommendations covering ALL 6 sections: morning, outdoor, windows, commute, indoor, evening.",
      "7. Each recommendation MUST include clear whatToDo, whyRecommended, supportingData (citing exact supplied metrics/windows), and priority (high/medium/low).",
      '8. Return ONLY valid JSON matching: { "summary": string, "recommendations": [{ "id": string, "section": "morning"|"outdoor"|"windows"|"commute"|"indoor"|"evening", "title": string, "whatToDo": string, "whyRecommended": string, "supportingData": string, "priority": "high"|"medium"|"low" }] }.',
    ].join("\n");

    const { text: rawText, usedModel, fallbackFrom } =
      await callGeminiWithModelFallback(
        ai,
        model,
        `Create a personalized daily air-quality action plan using this exact environmental context:\n${contextJson}`,
        systemInstruction
      );

    const parsedJson = parseGeminiJson(rawText);
    const validated = GeminiPlanOutputSchema.parse(parsedJson);

    const modelNote = fallbackFrom
      ? `Generated by Google Gemini (${usedModel}; automatic fallback from ${fallbackFrom} due to temporary high demand)`
      : `Generated by Google Gemini (${usedModel})`;

    return {
      mode: "gemini",
      model: usedModel,
      configuredModel: model,
      failoverUsed: Boolean(fallbackFrom),
      notice: `${modelNote} using live Open-Meteo modelled air-quality data and your selected profile.`,
      summary: validated.summary,
      lowerPollutionWindows: report.lowerPollutionWindows,
      recommendations: validated.recommendations,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message.slice(0, 120) : "Gemini request failed";
    console.warn("[AIRWISE] Gemini Daily Planner failed, using fallback:", reason);
    return buildRuleBasedDailyPlan(
      report,
      preferences,
      "Gemini request failed; using fallback"
    );
  }
}

export async function generateAssistantAnswer(
  question: string,
  report: AirQualityReport,
  preferences: PlannerPreferences
): Promise<AssistantResponse> {
  const { apiKey, model } = getGeminiConfig();

  if (!apiKey) {
    return buildRuleBasedAssistantAnswer(
      question,
      report,
      preferences,
      "GEMINI_API_KEY not configured"
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contextJson = buildEnvironmentalContextText(report, preferences);

    const systemInstruction = [
      "You are Ask AIRWISE, a helpful, evidence-grounded Urban Air Quality Assistant.",
      "Answer the user's question using ONLY the supplied Open-Meteo modelled environmental context and general established environmental science (such as what PM2.5 means).",
      "RULES:",
      "1. Never invent pollution readings, forecasts, or exact carbon savings.",
      "2. Never falsely claim Open-Meteo estimates are physical CPCB monitoring-station readings.",
      "3. Avoid medical diagnosis and unsupported health claims.",
      "4. Never recommend outdoor walking or cycling in Unhealthy/Hazardous AQI (US AQI >= 151) merely to cut emissions.",
      "5. Never recommend keeping windows closed indefinitely.",
      '6. Return ONLY valid JSON matching: { "answer": string, "keyFacts": string[], "actionSteps": string[], "dataUsed": string[] }.',
    ].join("\n");

    const { text: rawText, usedModel, fallbackFrom } =
      await callGeminiWithModelFallback(
        ai,
        model,
        `User question: "${question}"\n\nEnvironmental context:\n${contextJson}`,
        systemInstruction
      );

    const parsedJson = parseGeminiJson(rawText);
    const validated = GeminiAssistantOutputSchema.parse(parsedJson);

    const modelNote = fallbackFrom
      ? `Answered by Google Gemini (${usedModel}; automatic fallback from ${fallbackFrom} due to temporary high demand)`
      : `Answered by Google Gemini (${usedModel})`;

    return {
      mode: "gemini",
      model: usedModel,
      configuredModel: model,
      failoverUsed: Boolean(fallbackFrom),
      notice: `${modelNote} grounded in current Open-Meteo modelled air-quality data.`,
      answer: validated.answer,
      keyFacts: validated.keyFacts,
      actionSteps: validated.actionSteps,
      dataUsed: validated.dataUsed,
      disclaimer:
        "AIRWISE AI provides environmental guidance using modelled Open-Meteo estimates (not physical CPCB station readings) and does not provide medical diagnosis or clinical advice.",
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message.slice(0, 120) : "Gemini request failed";
    console.warn("[AIRWISE] Gemini Assistant failed, using fallback:", reason);
    return buildRuleBasedAssistantAnswer(
      question,
      report,
      preferences,
      "Gemini request failed; using fallback"
    );
  }
}
