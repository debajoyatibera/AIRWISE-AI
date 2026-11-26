"use client";

import { useState } from "react";
import {
  Bot,
  CalendarClock,
  Clock,
  Cpu,
  Loader2,
  Sparkles,
} from "lucide-react";
import { classifyUsAqi, formatMetricValue } from "@/lib/aqi";
import { formatLocationLabel } from "@/lib/locations";
import type {
  AirQualityReport,
  CommutePreference,
  DailyPlanResponse,
  PlannerPreferences,
  RecommendationPriority,
  RecommendationSection,
  UserProfileId,
} from "@/lib/types";

interface DailyPlannerSectionProps {
  report: AirQualityReport;
  preferences: PlannerPreferences;
  onChangePreferences: (prefs: PlannerPreferences) => void;
  onAiResult?: (meta: {
    mode: "gemini" | "rule-based-fallback";
    model: string | null;
    failoverUsed: boolean;
  }) => void;
}

const PROFILE_OPTIONS: Array<{
  id: UserProfileId;
  label: string;
  description: string;
}> = [
  {
    id: "general_adult",
    label: "General adult",
    description: "Standard daily commuter or resident",
  },
  {
    id: "child_family",
    label: "Child or family",
    description: "School travel, outdoor play & household care",
  },
  {
    id: "older_adult",
    label: "Older adult",
    description: "Low-strain pacing & gentler outdoor windows",
  },
  {
    id: "respiratory_sensitive",
    label: "Respiratory-sensitive user",
    description: "Extra caution for asthma/airway sensitivity",
  },
  {
    id: "outdoor_worker",
    label: "Outdoor worker",
    description: "Break pacing & exposure reduction on shift",
  },
];

const COMMUTE_OPTIONS: Array<{ id: CommutePreference; label: string }> = [
  { id: "public_transit", label: "Public transit (metro / bus / rail)" },
  { id: "carpool_shared", label: "Carpool or shared cab" },
  { id: "private_vehicle", label: "Private car / two-wheeler" },
  { id: "walking_cycling", label: "Walking or cycling" },
  { id: "remote_work", label: "Remote / work from home" },
];

const SECTION_BADGES: Record<RecommendationSection, string> = {
  morning: "Morning",
  outdoor: "Outdoor Guidance",
  windows: "Cleaner Windows",
  commute: "Commute",
  indoor: "Indoor Plan",
  evening: "Evening",
};

const PRIORITY_STYLES: Record<RecommendationPriority, string> = {
  high: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  medium: "border-teal-500/40 bg-teal-500/15 text-teal-200",
  low: "border-slate-600 bg-slate-800/70 text-slate-300",
};

export function DailyPlannerSection({
  report,
  preferences,
  onChangePreferences,
  onAiResult,
}: DailyPlannerSectionProps) {
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classification = classifyUsAqi(report.current.usAqi);

  async function handleGeneratePlan(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report,
          preferences,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate daily plan.");
      }
      setPlan(data.plan);
      onAiResult?.({
        mode: data.plan.mode,
        model: data.plan.model,
        failoverUsed: Boolean(data.plan.failoverUsed),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate personalized plan right now."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-6 shadow-lg">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <CalendarClock className="h-5 w-5 text-teal-400" aria-hidden="true" />
              Personalized GenAI Daily Planner
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Tailors your day in{" "}
              <span className="font-semibold text-white">
                {formatLocationLabel(report.location)}
              </span>{" "}
              (Modelled US AQI {formatMetricValue(report.current.usAqi, 0)} ·{" "}
              {classification.category}).
            </p>
          </div>
        </div>

        <form onSubmit={handleGeneratePlan} className="space-y-5">
          {/* Profile selector */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-300 uppercase">
              Who is this plan for?
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {PROFILE_OPTIONS.map((opt) => {
                const selected = preferences.profile === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onChangePreferences({ ...preferences, profile: opt.id })
                    }
                    className={`rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-teal-400 ${
                      selected
                        ? "border-teal-400 bg-teal-500/15 text-white shadow-sm"
                        : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Preferences inputs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="planner-schedule"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Work or school schedule
              </label>
              <input
                id="planner-schedule"
                type="text"
                maxLength={200}
                value={preferences.schedule}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    schedule: e.target.value,
                  })
                }
                placeholder="e.g. 08:30–17:30 office or 07:30–14:30 school"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="planner-outdoor"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Planned outdoor activities
              </label>
              <input
                id="planner-outdoor"
                type="text"
                maxLength={200}
                value={preferences.outdoorActivity}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    outdoorActivity: e.target.value,
                  })
                }
                placeholder="e.g. 30-min evening jog, park play, market errands"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="planner-commute"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Commuting preference
              </label>
              <select
                id="planner-commute"
                value={preferences.commutePreference}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    commutePreference: e.target.value as CommutePreference,
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white focus:border-teal-400 focus:outline-none"
              >
                {COMMUTE_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="planner-routine"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Preferred routine / extra notes
              </label>
              <input
                id="planner-routine"
                type="text"
                maxLength={300}
                value={preferences.routineNote}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    routineNote: e.target.value,
                  })
                }
                placeholder="e.g. Prefer early morning errands, cooking dinner at 8 PM"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-400">
              Recommendations explain what to do, why, supporting Open-Meteo
              data, and priority.
            </p>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-teal-500/20 transition hover:bg-teal-400 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-teal-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating Daily Plan...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Generate Personalized Daily Plan
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}
      </div>

      {/* Generated Plan Output */}
      {plan && (
        <section aria-label="Generated daily plan" className="space-y-5">
          {/* Mode Banner (Gemini vs Rule-Based Fallback) */}
          <div
            className={`flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              plan.mode === "gemini"
                ? "border-teal-500/40 bg-teal-950/30 text-teal-100"
                : "border-amber-500/40 bg-amber-950/30 text-amber-100"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {plan.mode === "gemini" ? (
                <Bot className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" aria-hidden="true" />
              ) : (
                <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider uppercase">
                  <span>
                    {plan.mode === "gemini"
                      ? `Google Gemini · Actual Model Used: ${plan.model}`
                      : "Rule-Based Fallback Mode (Not Gemini-Generated)"}
                  </span>
                  {plan.mode === "gemini" && plan.failoverUsed && plan.configuredModel && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 normal-case">
                      Auto-failover from {plan.configuredModel}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs opacity-90">{plan.notice}</p>
              </div>
            </div>
            <span className="text-[11px] opacity-80">
              {new Date(plan.generatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Summary + Lower-Pollution Windows */}
          <div className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md">
            <h3 className="text-base font-semibold text-white">Daily Summary</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
              {plan.summary}
            </p>
            {plan.lowerPollutionWindows.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-300">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Lower-pollution forecast windows:
                </span>
                {plan.lowerPollutionWindows.map((win) => (
                  <span
                    key={win.startTime}
                    className="rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-200"
                  >
                    {win.label} (avg AQI ~{formatMetricValue(win.avgUsAqi, 0)})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recommendation Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {plan.recommendations.map((rec) => (
              <article
                key={rec.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300">
                      {SECTION_BADGES[rec.section]}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                        PRIORITY_STYLES[rec.priority]
                      }`}
                    >
                      {rec.priority} priority
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">
                    {rec.title}
                  </h4>

                  <div className="space-y-2 text-xs leading-relaxed">
                    <div>
                      <span className="font-semibold text-teal-300">
                        What to do:{" "}
                      </span>
                      <span className="text-slate-100">{rec.whatToDo}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300">
                        Why recommended:{" "}
                      </span>
                      <span className="text-slate-300">
                        {rec.whyRecommended}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-amber-200/90">
                  <span className="font-semibold text-amber-300">
                    Supporting data:{" "}
                  </span>
                  {rec.supportingData}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
