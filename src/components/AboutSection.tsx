"use client";

import { BookOpen, Cpu, Globe2, ShieldAlert } from "lucide-react";
import type { HealthStatus } from "@/lib/types";

const US_AQI_BANDS = [
  { range: "0 – 50", label: "Good", meaning: "Minimal expected risk for daily outdoor routines." },
  { range: "51 – 100", label: "Moderate", meaning: "Acceptable air; unusually sensitive people should watch prolonged exertion." },
  { range: "101 – 150", label: "Unhealthy for Sensitive Groups", meaning: "Children, older adults, outdoor workers & respiratory-sensitive individuals should reduce prolonged outdoor exertion." },
  { range: "151 – 200", label: "Unhealthy", meaning: "Everyone should reduce prolonged or vigorous outdoor exertion; shift workouts indoors." },
  { range: "201 – 300", label: "Very Unhealthy", meaning: "Avoid strenuous outdoor activity; prioritize cleaner indoor air spaces." },
  { range: "301+", label: "Hazardous", meaning: "Severe pollution: stay indoors as much as practical and avoid outdoor physical effort." },
];

export function AboutSection({ healthStatus }: { healthStatus: HealthStatus }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-6 shadow-lg">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <BookOpen className="h-5 w-5 text-teal-400" aria-hidden="true" />
          About AIRWISE AI &amp; Data Sources
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          AIRWISE AI is an Urban Air Quality Assistant built for PromptWars
          Virtual Challenge 06. It pairs real-time modelled atmospheric data from
          Open-Meteo with Google Gemini reasoning (and a transparent,
          deterministic rule-based fallback) to help residents make practical,
          health-first daily decisions.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md">
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <Globe2 className="h-4 w-4 text-teal-400" aria-hidden="true" />
            Open-Meteo Air Quality &amp; Geocoding APIs
          </h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            <li>
              <strong className="text-slate-100">Geocoding API:</strong>{" "}
              <code className="text-teal-300">
                https://geocoding-api.open-meteo.com/v1/search
              </code>{" "}
              resolves city names to coordinates and local timezones.
            </li>
            <li>
              <strong className="text-slate-100">Air Quality API:</strong>{" "}
              <code className="text-teal-300">
                https://air-quality-api.open-meteo.com/v1/air-quality
              </code>{" "}
              supplies current estimates, past 24-hour trends, and hourly
              forecasts for <code className="text-slate-200">us_aqi</code>,{" "}
              <code className="text-slate-200">pm2_5</code>,{" "}
              <code className="text-slate-200">pm10</code>,{" "}
              <code className="text-slate-200">ozone</code>, and{" "}
              <code className="text-slate-200">nitrogen_dioxide</code>.
            </li>
            <li>
              <strong className="text-slate-100">Important Attribution:</strong>{" "}
              Open-Meteo uses global atmospheric composition models (such as
              Copernicus CAMS). These are <em>modelled estimates</em>, not
              physical measurements from CPCB or local ground monitoring
              stations.
            </li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md">
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <Cpu className="h-4 w-4 text-amber-400" aria-hidden="true" />
            GenAI Architecture &amp; Fallback Transparency
          </h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            <li>
              <strong className="text-slate-100">Server-Side SDK:</strong>{" "}
              Uses the official <code className="text-teal-300">@google/genai</code>{" "}
              SDK inside Next.js API routes so{" "}
              <code className="text-slate-200">GEMINI_API_KEY</code> never
              reaches browser code.
            </li>
            <li>
              <strong className="text-slate-100">Connection Status:</strong>{" "}
              {healthStatus.geminiConfigured
                ? "Connected (GEMINI_API_KEY configured on server)"
                : "Not configured — Rule-Based Fallback active (explicitly labelled on every AI response)."}
            </li>
            <li>
              <strong className="text-slate-100">Configured Primary Model:</strong>{" "}
              {healthStatus.configuredModel ?? "None"}
              {healthStatus.failoverEnabled
                ? ` (Auto-failover chain: ${healthStatus.fallbackModels.join(" → ")})`
                : ""}
            </li>
            <li>
              <strong className="text-slate-100">Actual Model Used (Session):</strong>{" "}
              {healthStatus.lastUsedModel ??
                "No Gemini request run yet in this session"}
            </li>
            <li>
              <strong className="text-slate-100">Safety &amp; Grounding:</strong>{" "}
              Prompts and deterministic guards block fabricated numbers, avoid
              medical diagnoses, forbid indefinite window closure, and block
              recommending outdoor walking/cycling in unhealthy air.
            </li>
          </ul>
        </article>
      </div>

      {/* US AQI Reference */}
      <section className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md">
        <h3 className="mb-3 text-base font-bold text-white">
          US AQI Classification Reference
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300">
                <th className="py-2 pr-4 font-semibold">US AQI</th>
                <th className="py-2 pr-4 font-semibold">Category</th>
                <th className="py-2 font-semibold">Guidance Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {US_AQI_BANDS.map((band) => (
                <tr key={band.range}>
                  <td className="py-2.5 pr-4 font-mono font-semibold text-teal-300">
                    {band.range}
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-white">
                    {band.label}
                  </td>
                  <td className="py-2.5">{band.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Limitations */}
      <section className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 text-xs text-slate-300">
        <ShieldAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h3 className="font-semibold text-amber-200">
            Known Limitations &amp; Health Disclaimer
          </h3>
          <p>
            Grid-scale atmospheric models can differ from hyper-local street
            canyons, construction zones, or physical CPCB station sensors.
            AIRWISE AI does not provide medical diagnosis or clinical
            treatment; individuals with asthma, COPD, or cardiovascular
            conditions should follow their clinician&apos;s personalized guidance.
          </p>
        </div>
      </section>
    </div>
  );
}
