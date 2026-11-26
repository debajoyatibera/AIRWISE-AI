"use client";

import {
  Activity,
  AlertTriangle,
  Clock,
  Info,
  ShieldAlert,
  Sparkles,
  Wind,
} from "lucide-react";
import { classifyUsAqi, formatMetricValue, POLLUTANT_META } from "@/lib/aqi";
import { formatLocationLabel } from "@/lib/locations";
import type { AirQualityReport } from "@/lib/types";
import { PollutionCharts } from "./PollutionCharts";

interface DashboardSectionProps {
  report: AirQualityReport;
  onNavigateTab: (
    tab: "planner" | "indoor" | "eco" | "ask" | "about"
  ) => void;
}

export function DashboardSection({
  report,
  onNavigateTab,
}: DashboardSectionProps) {
  const { current, lowerPollutionWindows, next24Hours, metadata, location } =
    report;
  const classification = classifyUsAqi(current.usAqi);

  const pollutantCards = [
    {
      meta: POLLUTANT_META.pm25,
      value: current.pm25,
      decimals: 1,
    },
    {
      meta: POLLUTANT_META.pm10,
      value: current.pm10,
      decimals: 1,
    },
    {
      meta: POLLUTANT_META.ozone,
      value: current.ozone,
      decimals: 1,
    },
    {
      meta: POLLUTANT_META.nitrogenDioxide,
      value: current.nitrogenDioxide,
      decimals: 1,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Honest Source & Modelled Estimate Attribution */}
      <div
        role="note"
        aria-label="Open-Meteo modelled estimate attribution"
        className="flex items-start gap-3 rounded-2xl border border-teal-500/30 bg-teal-950/30 px-4 py-3 text-xs text-slate-200"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="font-semibold text-teal-200">
            Modelled Atmospheric Estimate — {metadata.source}
          </p>
          <p className="text-slate-300">{metadata.modelNotice}</p>
        </div>
      </div>

      {metadata.missingMetrics && metadata.missingMetrics.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-100"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <span>
            Partial model availability: {metadata.missingMetrics.join(", ")}{" "}
            reported as unavailable for this hour by Open-Meteo. Other metrics
            and forecasts remain live.
          </span>
        </div>
      )}

      {/* Hero Status + Pollutant Breakdown Grid */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Main US AQI Card */}
        <section
          aria-label="Current modelled US AQI summary"
          className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-gradient-to-br from-[#0e2042] via-[#0d1b36] to-[#09152b] p-6 shadow-xl lg:col-span-5"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wider text-teal-300 uppercase">
                  Current Modelled Estimate
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {formatLocationLabel(location)}
                </h2>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classification.badgeClasses}`}
              >
                {classification.category}
              </span>
            </div>

            <div className="flex items-baseline gap-4 pt-2">
              <div
                className="text-5xl font-extrabold tracking-tight tabular-nums sm:text-6xl"
                style={{ color: classification.accentHex }}
              >
                {formatMetricValue(current.usAqi, 0)}
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-200">
                  US AQI Scale
                </div>
                <div className="text-xs text-slate-400">
                  Observed: {current.observedAt.replace("T", " ")} (
                  {metadata.timezoneAbbreviation || location.timezone})
                </div>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-200">
              {classification.summary}
            </p>

            {classification.isUnhealthyOrWorse && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                <span>
                  Elevated modelled pollution: limit strenuous outdoor workouts
                  and prioritize indoor activities or cleaner forecast windows.
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-700/60 pt-4">
            <button
              type="button"
              onClick={() => onNavigateTab("planner")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-teal-400 focus-visible:outline-2 focus-visible:outline-teal-300"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Open Daily AI Planner
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("ask")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-900/70 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-teal-500/50 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-400"
            >
              Ask AIRWISE
            </button>
          </div>
        </section>

        {/* Pollutant Cards */}
        <section
          aria-label="Current pollutant concentrations"
          className="grid gap-4 sm:grid-cols-2 lg:col-span-7"
        >
          {pollutantCards.map(({ meta, value, decimals }) => {
            const isAvailable = value !== null && !Number.isNaN(value);
            return (
              <article
                key={meta.key}
                className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-200">
                      {meta.label}
                    </h3>
                    <span className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      {meta.unit}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-bold tabular-nums ${
                        isAvailable ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {formatMetricValue(value, decimals)}
                    </span>
                    {isAvailable && (
                      <span className="text-xs text-slate-400">
                        {meta.unit}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {meta.description}
                  </p>
                </div>
                <p className="mt-3 border-t border-slate-800 pt-2.5 text-[11px] text-teal-300/90">
                  {meta.thresholdNote}
                </p>
              </article>
            );
          })}
        </section>
      </div>

      {/* Lower-Pollution Forecast Windows */}
      <section
        aria-label="Lower-pollution forecast windows"
        className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-lg"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-teal-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">
              Lower-Pollution Forecast Windows (Next 24 Hours)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Forecast estimates (not ground sensors) · helps time errands or
            brief ventilation
          </span>
        </div>

        {lowerPollutionWindows.length === 0 ? (
          <p className="text-sm text-slate-300">
            Forecast window estimates are currently unavailable. Check the hourly
            forecast below.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {lowerPollutionWindows.map((win, idx) => {
              const cls = classifyUsAqi(win.avgUsAqi);
              const stillElevated = (win.avgUsAqi ?? 0) > 150;
              return (
                <div
                  key={win.startTime}
                  className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-teal-300 uppercase">
                      {idx === 0
                        ? stillElevated
                          ? "Lowest Forecast Dip"
                          : "Best Window"
                        : `Option ${idx + 1}`}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls.badgeClasses}`}
                    >
                      {win.category}
                    </span>
                  </div>
                  <p className="mt-1.5 text-lg font-bold text-white">
                    {win.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Avg US AQI: ~{formatMetricValue(win.avgUsAqi, 0)} · Avg PM2.5:{" "}
                    {formatMetricValue(win.avgPm25, 1)} µg/m³
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recharts 24h Trend & Hourly Forecast */}
      <PollutionCharts
        past24Hours={report.past24Hours}
        next24Hours={report.next24Hours}
      />

      {/* Compact Hourly Forecast Table */}
      <section
        aria-label="Hourly air quality forecast strip"
        className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-lg"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">
              Hourly Forecast Breakdown
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Fetched {new Date(metadata.fetchedAt).toLocaleTimeString()} ·{" "}
            {metadata.cached ? "Cached (5m TTL)" : "Live API response"}
          </span>
        </div>

        {next24Hours.length === 0 ? (
          <p className="text-sm text-slate-300">
            Hourly forecast points are unavailable for this location.
          </p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-2.5">
              {next24Hours.slice(0, 18).map((hour) => {
                const cls = classifyUsAqi(hour.usAqi);
                return (
                  <div
                    key={hour.time}
                    className="flex w-24 shrink-0 flex-col items-center rounded-xl border border-slate-700/70 bg-slate-950/60 px-2.5 py-3 text-center"
                  >
                    <span className="text-xs font-medium text-slate-300">
                      {hour.hourLabel}
                    </span>
                    <span
                      className="mt-1.5 text-lg font-bold tabular-nums"
                      style={{ color: cls.accentHex }}
                    >
                      {formatMetricValue(hour.usAqi, 0)}
                    </span>
                    <span className="text-[10px] text-slate-400">US AQI</span>
                    <span className="mt-1.5 text-[11px] font-medium text-slate-200 tabular-nums">
                      {formatMetricValue(hour.pm25, 0)} µg/m³
                    </span>
                    <span className="text-[10px] text-slate-400">PM2.5</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Quick Action Cards linking Indoor & Eco */}
      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigateTab("indoor")}
          className="flex items-start justify-between gap-4 rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 text-left transition hover:border-teal-500/50 focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
              <Wind className="h-4 w-4" aria-hidden="true" />
              Indoor Air Advisor
            </div>
            <p className="text-xs text-slate-300">
              See timed cross-ventilation windows, cooking exhaust habits, HEPA
              tips, and dust reduction steps calibrated to {location.name}.
            </p>
          </div>
          <span className="text-xs font-semibold text-teal-400">Open →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("eco")}
          className="flex items-start justify-between gap-4 rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 text-left transition hover:border-amber-500/50 focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Eco Actions (Air-Safe)
            </div>
            <p className="text-xs text-slate-300">
              Explore responsible transit, anti-idling, and household choices
              with automatic health-first guards in polluted conditions.
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-300">Open →</span>
        </button>
      </div>
    </div>
  );
}
