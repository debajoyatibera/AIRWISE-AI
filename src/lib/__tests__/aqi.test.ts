import { describe, expect, it } from "vitest";
import {
  classifyUsAqi,
  findLowerPollutionWindows,
  formatMetricValue,
  splitPastAndForecast,
} from "@/lib/aqi";
import type { HourlyPoint } from "@/lib/types";

describe("classifyUsAqi", () => {
  it("handles unavailable values gracefully", () => {
    expect(classifyUsAqi(null).level).toBe("unavailable");
    expect(classifyUsAqi(undefined).category).toBe("Unavailable");
    expect(classifyUsAqi(Number.NaN).shortLabel).toBe("N/A");
  });

  it("classifies all EPA US AQI breakpoint boundaries accurately", () => {
    expect(classifyUsAqi(0).category).toBe("Good");
    expect(classifyUsAqi(50).category).toBe("Good");
    expect(classifyUsAqi(51).category).toBe("Moderate");
    expect(classifyUsAqi(100).category).toBe("Moderate");
    expect(classifyUsAqi(101).category).toBe("Unhealthy for Sensitive Groups");
    expect(classifyUsAqi(150).category).toBe("Unhealthy for Sensitive Groups");
    expect(classifyUsAqi(151).category).toBe("Unhealthy");
    expect(classifyUsAqi(151).isUnhealthyOrWorse).toBe(true);
    expect(classifyUsAqi(200).category).toBe("Unhealthy");
    expect(classifyUsAqi(201).category).toBe("Very Unhealthy");
    expect(classifyUsAqi(201).isVeryUnhealthyOrWorse).toBe(true);
    expect(classifyUsAqi(300).category).toBe("Very Unhealthy");
    expect(classifyUsAqi(301).category).toBe("Hazardous");
    expect(classifyUsAqi(301).isHazardous).toBe(true);
  });
});

describe("formatMetricValue", () => {
  it("formats numbers and unavailable values", () => {
    expect(formatMetricValue(42.6, 0)).toBe("43");
    expect(formatMetricValue(18.24, 1)).toBe("18.2");
    expect(formatMetricValue(null, 1)).toBe("Unavailable");
  });
});

describe("splitPastAndForecast & findLowerPollutionWindows", () => {
  const sampleHourly: HourlyPoint[] = Array.from({ length: 10 }, (_, idx) => ({
    time: `2026-11-26T${String(idx + 8).padStart(2, "0")}:00`,
    hourLabel: `${String(idx + 8).padStart(2, "0")}:00`,
    usAqi: idx >= 4 && idx <= 5 ? 60 : 165,
    pm25: idx >= 4 && idx <= 5 ? 16 : 72,
    pm10: 95,
    ozone: 42,
    nitrogenDioxide: 31,
  }));

  it("splits past and forecast around observedAt", () => {
    const { past24Hours, next24Hours } = splitPastAndForecast(
      sampleHourly,
      "2026-11-26T10:00"
    );
    expect(past24Hours).toHaveLength(3); // 08, 09, 10
    expect(next24Hours).toHaveLength(8); // 10..17
    expect(next24Hours[0].hourLabel).toBe("10:00");
  });

  it("identifies the cleanest forecast window first", () => {
    const { next24Hours } = splitPastAndForecast(
      sampleHourly,
      "2026-11-26T10:00"
    );
    const windows = findLowerPollutionWindows(next24Hours, 2);
    expect(windows.length).toBeGreaterThan(0);
    expect(windows[0].label).toBe("12:00 – 13:00");
    expect(windows[0].avgUsAqi).toBe(60);
    expect(windows[0].category).toBe("Moderate");
  });

  it("advances forecast start to next full hour for half-hour timezones and labels cross-midnight windows", () => {
    const istSeries: HourlyPoint[] = [
      {
        time: "2026-11-26T22:00",
        hourLabel: "22:00",
        usAqi: 180,
        pm25: 90,
        pm10: 110,
        ozone: 30,
        nitrogenDioxide: 40,
      },
      {
        time: "2026-11-26T23:00",
        hourLabel: "23:00",
        usAqi: 190,
        pm25: 95,
        pm10: 115,
        ozone: 30,
        nitrogenDioxide: 42,
      },
      {
        time: "2026-11-27T00:00",
        hourLabel: "00:00",
        usAqi: 120,
        pm25: 45,
        pm10: 70,
        ozone: 28,
        nitrogenDioxide: 30,
      },
      {
        time: "2026-11-27T01:00",
        hourLabel: "01:00",
        usAqi: 110,
        pm25: 40,
        pm10: 65,
        ozone: 26,
        nitrogenDioxide: 28,
      },
    ];

    const { past24Hours, next24Hours } = splitPastAndForecast(
      istSeries,
      "2026-11-26T23:30"
    );
    expect(past24Hours.at(-1)?.time).toBe("2026-11-26T23:00");
    expect(next24Hours[0].time).toBe("2026-11-27T00:00");

    const windows = findLowerPollutionWindows(
      next24Hours,
      2,
      "2026-11-26T23:30"
    );
    expect(windows[0].label).toBe("11-27 · 00:00 – 01:00");
  });
});
