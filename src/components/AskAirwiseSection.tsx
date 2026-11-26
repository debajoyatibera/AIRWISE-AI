"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
} from "lucide-react";
import { classifyUsAqi, formatMetricValue } from "@/lib/aqi";
import { formatLocationLabel } from "@/lib/locations";
import type {
  AirQualityReport,
  AssistantResponse,
  PlannerPreferences,
} from "@/lib/types";

interface AskAirwiseSectionProps {
  report: AirQualityReport;
  preferences: PlannerPreferences;
  onAiResult?: (meta: {
    mode: "gemini" | "rule-based-fallback";
    model: string | null;
    failoverUsed: boolean;
  }) => void;
}

const EXAMPLE_QUESTIONS = [
  "Is it safe to exercise outdoors now?",
  "What should my family do today?",
  "How can I reduce indoor pollution?",
  "What does PM2.5 mean?",
  "When should I travel today?",
];

interface QAPair {
  id: string;
  question: string;
  response: AssistantResponse;
}

export function AskAirwiseSection({
  report,
  preferences,
  onAiResult,
}: AskAirwiseSectionProps) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAPair[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classification = classifyUsAqi(report.current.usAqi);

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setError("Please enter a question of at least 3 characters.");
      return;
    }

    setIsAsking(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          report,
          preferences,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to get a response.");
      }
      setHistory((prev) => [
        {
          id: `${Date.now()}-${prev.length}`,
          question: trimmed,
          response: data.response,
        },
        ...prev,
      ]);
      onAiResult?.({
        mode: data.response.mode,
        model: data.response.model,
        failoverUsed: Boolean(data.response.failoverUsed),
      });
      setQuestion("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to answer right now. Please try again."
      );
    } finally {
      setIsAsking(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitQuestion(question);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-6 shadow-lg">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <MessageSquare className="h-5 w-5 text-teal-400" aria-hidden="true" />
              Ask AIRWISE
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Ask grounded questions using live Open-Meteo data for{" "}
              <span className="font-semibold text-white">
                {formatLocationLabel(report.location)}
              </span>{" "}
              (US AQI {formatMetricValue(report.current.usAqi, 0)} ·{" "}
              {classification.category}).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-300">
              Profile: {preferences.profile.replace("_", " ")}
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Clear history ({history.length})
              </button>
            )}
          </div>
        </div>

        {/* Example question chips */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Example questions
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isAsking}
                onClick={() => {
                  setQuestion(q);
                  void submitQuestion(q);
                }}
                className="rounded-full border border-teal-500/35 bg-teal-500/10 px-3.5 py-1.5 text-xs font-medium text-teal-200 transition hover:bg-teal-500/20 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-teal-400"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Question Form */}
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="ask-airwise-input" className="sr-only">
            Ask a question about air quality
          </label>
          <input
            id="ask-airwise-input"
            type="text"
            maxLength={600}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about outdoor workouts, school travel, indoor air, or pollutants..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isAsking}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-teal-300"
          >
            {isAsking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Ask AIRWISE
              </>
            )}
          </button>
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

      {/* Answers */}
      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0d1b36]/40 p-8 text-center text-sm text-slate-400">
          Select an example question above or ask your own to receive a
          structured answer grounded in {report.location.name}&apos;s current
          modelled air-quality data.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <article
              key={item.id}
              className="space-y-4 rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-6 shadow-lg"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  &ldquo;{item.question}&rdquo;
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    item.response.mode === "gemini"
                      ? "border-teal-500/40 bg-teal-500/15 text-teal-200"
                      : "border-amber-500/40 bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {item.response.mode === "gemini" ? (
                    <>
                      <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                      Gemini · {item.response.model}
                      {item.response.failoverUsed ? " (Failover)" : ""}
                    </>
                  ) : (
                    <>
                      <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                      Rule-Based Fallback
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs text-slate-400">{item.response.notice}</p>

              <p className="text-sm leading-relaxed text-slate-100">
                {item.response.answer}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-teal-300 uppercase">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Actionable Steps
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {item.response.actionSteps.map((step, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-semibold text-teal-400">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-amber-300 uppercase">
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    Environmental Context Used
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {item.response.keyFacts.map((fact, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-semibold text-amber-400">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">
                <ShieldAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>{item.response.disclaimer}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
