import { describe, expect, it } from "vitest";
import { buildEcoActions, buildIndoorGuidance } from "@/lib/advisors";
import {
  buildRuleBasedAssistantAnswer,
  buildRuleBasedDailyPlan,
} from "@/lib/fallback-ai";
import { DEFAULT_LOCATION } from "@/lib/locations";
import type { AirQualityReport, PlannerPreferences } from "@/lib/types";
import { AssistantRequestSchema, LocationSchema } from "@/lib/validators";

function makeReport(usAqi: number): AirQualityReport {
  return {
    location: DEFAULT_LOCATION,
    current: {
      observedAt: "2026-11-26T18:00",
      usAqi,
      pm25: usAqi >= 151 ? 78.4 : 18.2,
      pm10: usAqi >= 151 ? 124.0 : 35.0,
      ozone: 48.5,
      nitrogenDioxide: 39.2,
    },
    past24Hours: [
      {
        time: "2026-11-26T17:00",
        hourLabel: "17:00",
        usAqi,
        pm25: 40,
        pm10: 60,
        ozone: 45,
        nitrogenDioxide: 35,
      },
    ],
    next24Hours: [
      {
        time: "2026-11-26T19:00",
        hourLabel: "19:00",
        usAqi,
        pm25: 40,
        pm10: 60,
        ozone: 45,
        nitrogenDioxide: 35,
      },
      {
        time: "2026-11-26T20:00",
        hourLabel: "20:00",
        usAqi: Math.max(45, usAqi - 40),
        pm25: 22,
        pm10: 42,
        ozone: 38,
        nitrogenDioxide: 28,
      },
    ],
    lowerPollutionWindows: [
      {
        startTime: "2026-11-26T13:00",
        endTime: "2026-11-26T14:00",
        label: "13:00 – 14:00",
        avgUsAqi: 88,
        maxUsAqi: 94,
        avgPm25: 28.5,
        category: "Moderate",
      },
    ],
    metadata: {
      source: "Open-Meteo Air Quality API",
      modelNotice:
        "Modelled atmospheric estimates, not physical CPCB monitoring station readings.",
      fetchedAt: "2026-11-26T18:00:00Z",
      cached: false,
      timezoneAbbreviation: "IST",
    },
  };
}

const samplePrefs: PlannerPreferences = {
  profile: "respiratory_sensitive",
  schedule: "09:00–17:30",
  outdoorActivity: "Evening brisk walk",
  commutePreference: "walking_cycling",
  routineNote: "Prefers low-dust indoor exercise",
};

describe("Indoor Air Advisor", () => {
  it("covers all 7 household topics and never advises indefinite window closure", () => {
    const items = buildIndoorGuidance(makeReport(185));
    expect(items).toHaveLength(7);
    const ventilation = items.find((i) => i.topic === "ventilation");
    expect(ventilation).toBeDefined();
    expect(ventilation?.whatToDo.toLowerCase()).toContain("10–15");
    expect(ventilation?.whatToDo.toLowerCase()).toContain(
      "instead of keeping windows closed indefinitely"
    );
  });
});

describe("Eco Action Planner", () => {
  it("blocks recommending outdoor walking/cycling when US AQI is unhealthy or hazardous", () => {
    const unhealthyActions = buildEcoActions(makeReport(185));
    const commuteChoice = unhealthyActions.find(
      (a) => a.category === "commute_choice"
    );
    expect(commuteChoice).toBeDefined();
    expect(commuteChoice?.safeNow).toBe(false);
    expect(commuteChoice?.whatToDo).toContain("Do NOT walk or cycle outdoors");

    const hazardousActions = buildEcoActions(makeReport(320));
    const hazCommute = hazardousActions.find(
      (a) => a.category === "commute_choice"
    );
    expect(hazCommute?.safeNow).toBe(false);
  });

  it("allows safe active travel in Good AQI without fabricating carbon figures", () => {
    const goodActions = buildEcoActions(makeReport(38));
    const commuteChoice = goodActions.find(
      (a) => a.category === "commute_choice"
    );
    expect(commuteChoice?.safeNow).toBe(true);
    for (const action of goodActions) {
      expect(action.environmentalBenefit).not.toMatch(/\d+\s*(kg|g)\s*co2/i);
    }
  });
});

describe("Rule-Based AI Fallback", () => {
  it("labels daily plan clearly as rule-based fallback with all 6 sections", () => {
    const plan = buildRuleBasedDailyPlan(
      makeReport(168),
      samplePrefs,
      "GEMINI_API_KEY not configured"
    );
    expect(plan.mode).toBe("rule-based-fallback");
    expect(plan.model).toBeNull();
    expect(plan.notice).toContain("not by Google Gemini");
    expect(plan.recommendations).toHaveLength(6);
    for (const rec of plan.recommendations) {
      expect(rec.whatToDo.length).toBeGreaterThan(10);
      expect(rec.whyRecommended.length).toBeGreaterThan(10);
      expect(rec.supportingData.length).toBeGreaterThan(10);
    }
  });

  it("answers Ask AIRWISE questions with environmental grounding and disclaimer", () => {
    const answer = buildRuleBasedAssistantAnswer(
      "Is it safe to exercise outdoors now?",
      makeReport(175),
      samplePrefs
    );
    expect(answer.mode).toBe("rule-based-fallback");
    expect(answer.answer).toContain("175");
    expect(answer.disclaimer).toContain("not provide medical diagnosis");
  });
});

describe("Input validation", () => {
  it("rejects out-of-range coordinates and overly short questions", () => {
    expect(
      LocationSchema.safeParse({
        id: "bad",
        name: "Bad",
        country: "IN",
        latitude: 120,
        longitude: 88,
        timezone: "UTC",
      }).success
    ).toBe(false);

    expect(
      AssistantRequestSchema.safeParse({
        question: "hi",
        report: makeReport(80),
        preferences: samplePrefs,
      }).success
    ).toBe(false);
  });
});
