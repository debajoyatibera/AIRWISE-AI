import { afterEach, describe, expect, it } from "vitest";
import { getGeminiHealthStatus } from "@/lib/gemini";

describe("getGeminiHealthStatus", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
    if (originalModel === undefined) {
      delete process.env.GEMINI_MODEL;
    } else {
      process.env.GEMINI_MODEL = originalModel;
    }
  });

  it("reports rule-based-fallback accurately when GEMINI_API_KEY is absent", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;

    const status = getGeminiHealthStatus();
    expect(status.geminiConfigured).toBe(false);
    expect(status.activeMode).toBe("rule-based-fallback");
    expect(status.configuredModel).toBeNull();
    expect(status.failoverEnabled).toBe(false);
  });

  it("reports configured primary model and failover chain without exposing the API key", () => {
    process.env.GEMINI_API_KEY = "test-placeholder-secret-not-exposed";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";

    const status = getGeminiHealthStatus();
    expect(status.geminiConfigured).toBe(true);
    expect(status.activeMode).toBe("gemini");
    expect(status.configuredModel).toBe("gemini-3.8-flash");
    expect(status.failoverEnabled).toBe(true);
    expect(status.fallbackModels).toContain("gemini-3.5-flash-lite");
    expect(JSON.stringify(status)).not.toContain("test-placeholder-secret-not-exposed");
  });
});
