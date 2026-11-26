"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  Home,
  LayoutDashboard,
  Leaf,
  Loader2,
  MessageSquare,
  RotateCcw,
  Wind,
} from "lucide-react";
import { classifyUsAqi, formatMetricValue } from "@/lib/aqi";
import { DEFAULT_LOCATION } from "@/lib/locations";
import type {
  AirQualityReport,
  HealthStatus,
  LocationOption,
  PlannerPreferences,
} from "@/lib/types";
import { AboutSection } from "./AboutSection";
import { AskAirwiseSection } from "./AskAirwiseSection";
import { DailyPlannerSection } from "./DailyPlannerSection";
import { DashboardSection } from "./DashboardSection";
import { EcoActionsSection } from "./EcoActionsSection";
import { IndoorAdvisorSection } from "./IndoorAdvisorSection";
import { LocationSelector } from "./LocationSelector";

type ActiveTab = "dashboard" | "planner" | "indoor" | "eco" | "ask" | "about";

const NAV_TABS: Array<{
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "planner", label: "Daily AI Planner", icon: CalendarClock },
  { id: "indoor", label: "Indoor Air Advisor", icon: Home },
  { id: "eco", label: "Eco Actions", icon: Leaf },
  { id: "ask", label: "Ask AIRWISE", icon: MessageSquare },
  { id: "about", label: "About & Data Sources", icon: BookOpen },
];

export function AirwiseApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationOption>(DEFAULT_LOCATION);
  const [report, setReport] = useState<AirQualityReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [geminiStatus, setGeminiStatus] = useState<HealthStatus>({
    status: "ok",
    geminiConfigured: false,
    activeMode: "rule-based-fallback",
    configuredModel: null,
    fallbackModels: [],
    failoverEnabled: false,
    lastUsedModel: null,
    lastFailoverAt: null,
  });

  const [preferences, setPreferences] = useState<PlannerPreferences>({
    profile: "general_adult",
    schedule: "09:00–18:00 office or classes",
    outdoorActivity: "30-minute evening walk or light workout",
    commutePreference: "public_transit",
    routineNote: "",
  });

  const buildAirQualityUrl = useCallback(
    (location: LocationOption, forceRefresh = false) => {
      const params = new URLSearchParams({
        id: location.id,
        name: location.name,
        country: location.country,
        lat: String(location.latitude),
        lon: String(location.longitude),
        timezone: location.timezone,
      });
      if (location.admin1) {
        params.set("admin1", location.admin1);
      }
      if (forceRefresh) {
        params.set("refresh", "1");
      }
      return `/api/air-quality?${params.toString()}`;
    },
    []
  );

  const loadAirQuality = useCallback(
    async (location: LocationOption, forceRefresh = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(buildAirQualityUrl(location, forceRefresh));
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to fetch air quality data.");
        }
        setReport(data.report);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load air quality data from Open-Meteo."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [buildAirQualityUrl]
  );

  useEffect(() => {
    let active = true;

    fetch(buildAirQualityUrl(DEFAULT_LOCATION, false))
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to fetch air quality data.");
        }
        return data.report as AirQualityReport;
      })
      .then((initialReport) => {
        if (active) {
          setReport(initialReport);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load air quality data from Open-Meteo."
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthStatus | null) => {
        if (active && data) {
          setGeminiStatus(data);
        }
      })
      .catch(() => {
        // Ignore non-critical status check failure
      });

    return () => {
      active = false;
    };
  }, [buildAirQualityUrl]);

  function handleSelectLocation(loc: LocationOption) {
    setSelectedLocation(loc);
    void loadAirQuality(loc, false);
  }

  function handleRefresh() {
    void loadAirQuality(selectedLocation, true);
  }

  function handleAiResult(meta: {
    mode: "gemini" | "rule-based-fallback";
    model: string | null;
    failoverUsed: boolean;
  }) {
    if (meta.mode === "gemini" && meta.model) {
      setGeminiStatus((prev) => ({
        ...prev,
        lastUsedModel: meta.model,
        lastFailoverAt: meta.failoverUsed
          ? new Date().toISOString()
          : prev.lastFailoverAt,
      }));
    }
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const currentIndex = NAV_TABS.findIndex((t) => t.id === activeTab);
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + NAV_TABS.length) % NAV_TABS.length;
    setActiveTab(NAV_TABS[nextIndex].id);
  }

  const currentClassification = report
    ? classifyUsAqi(report.current.usAqi)
    : null;

  const geminiBadgeLabel = (() => {
    if (!geminiStatus.geminiConfigured) {
      return "Rule-Based AI Fallback";
    }
    if (
      geminiStatus.lastUsedModel &&
      geminiStatus.lastUsedModel !== geminiStatus.configuredModel
    ) {
      return `Gemini Connected · Active: ${geminiStatus.lastUsedModel} (Failover)`;
    }
    if (geminiStatus.lastUsedModel) {
      return `Gemini Connected · Active: ${geminiStatus.lastUsedModel}`;
    }
    return `Gemini Connected · Primary: ${geminiStatus.configuredModel}${
      geminiStatus.failoverEnabled ? " (Auto-failover)" : ""
    }`;
  })();

  return (
    <div className="min-h-screen bg-[#071124] text-slate-50">
      {/* Top Product Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#071124]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-slate-950 shadow-md shadow-teal-500/20">
              <Wind className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  AIRWISE AI
                </h1>
                <span className="rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-teal-300 uppercase">
                  Urban Air Assistant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Open-Meteo Modelled Air Intelligence · GenAI Daily Guidance
              </p>
            </div>
          </div>

          {/* Live Status Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            {report && currentClassification && (
              <div
                className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3.5 py-1.5 text-xs"
                aria-label="Active location air quality summary"
              >
                <span className="font-semibold text-white">
                  {report.location.name}
                </span>
                <span className="text-slate-500">|</span>
                <span
                  className="font-bold tabular-nums"
                  style={{ color: currentClassification.accentHex }}
                >
                  US AQI {formatMetricValue(report.current.usAqi, 0)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${currentClassification.badgeClasses}`}
                >
                  {currentClassification.shortLabel}
                </span>
              </div>
            )}

            <span
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                geminiStatus.geminiConfigured
                  ? "border-teal-500/40 bg-teal-500/10 text-teal-200"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-200"
              }`}
              title={
                geminiStatus.geminiConfigured
                  ? `Primary: ${geminiStatus.configuredModel ?? "unset"} | Failover: ${geminiStatus.fallbackModels.join(", ") || "none"}`
                  : "GEMINI_API_KEY not configured on server"
              }
            >
              {geminiBadgeLabel}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          aria-label="Primary application sections"
          className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8"
        >
          <div
            role="tablist"
            onKeyDown={handleTabKeyDown}
            className="flex min-w-max gap-1 pb-2"
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-teal-400 sm:text-sm ${
                    isActive
                      ? "bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/25"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content Container */}
      <main
        id="main-content"
        className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
      >
        {/* Persistent Location Selector */}
        <LocationSelector
          selectedLocation={selectedLocation}
          isLoading={isLoading}
          onSelectLocation={handleSelectLocation}
          onRefresh={handleRefresh}
        />

        {/* Loading, Error, or Active Section */}
        {isLoading && !report ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-700/60 bg-[#0d1b36] py-20 text-center"
          >
            <Loader2
              className="h-8 w-8 animate-spin text-teal-400"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-slate-200">
              Retrieving live Open-Meteo modelled air quality data for{" "}
              {selectedLocation.name}...
            </p>
          </div>
        ) : error && !report ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/40 bg-red-950/30 p-10 text-center"
          >
            <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">
                Air Quality Data Temporarily Unavailable
              </h2>
              <p className="max-w-md text-sm text-red-200">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry Fetching Data
            </button>
          </div>
        ) : (
          <>
            {error && report && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-xs text-amber-100"
              >
                <span>
                  Refresh failed ({error}). Showing previously loaded data for{" "}
                  {report.location.name}.
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded-lg border border-amber-400/40 px-3 py-1 font-semibold hover:bg-amber-500/20"
                >
                  Retry
                </button>
              </div>
            )}

            {report && activeTab === "dashboard" && (
              <div id="panel-dashboard" role="tabpanel" aria-labelledby="tab-dashboard">
                <DashboardSection
                  report={report}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              </div>
            )}

            {report && activeTab === "planner" && (
              <div id="panel-planner" role="tabpanel" aria-labelledby="tab-planner">
                <DailyPlannerSection
                  report={report}
                  preferences={preferences}
                  onChangePreferences={setPreferences}
                  onAiResult={handleAiResult}
                />
              </div>
            )}

            {report && activeTab === "indoor" && (
              <div id="panel-indoor" role="tabpanel" aria-labelledby="tab-indoor">
                <IndoorAdvisorSection report={report} />
              </div>
            )}

            {report && activeTab === "eco" && (
              <div id="panel-eco" role="tabpanel" aria-labelledby="tab-eco">
                <EcoActionsSection report={report} />
              </div>
            )}

            {report && activeTab === "ask" && (
              <div id="panel-ask" role="tabpanel" aria-labelledby="tab-ask">
                <AskAirwiseSection
                  report={report}
                  preferences={preferences}
                  onAiResult={handleAiResult}
                />
              </div>
            )}

            {activeTab === "about" && (
              <div id="panel-about" role="tabpanel" aria-labelledby="tab-about">
                <AboutSection healthStatus={geminiStatus} />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="mt-12 border-t border-slate-800/80 bg-[#050d1c] py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            AIRWISE AI · Urban Air Quality Assistant (PromptWars Virtual
            Challenge 06)
          </p>
          <p>
            Data: Open-Meteo Air Quality &amp; Geocoding APIs (modelled
            estimates, not CPCB station readings) · Not medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
