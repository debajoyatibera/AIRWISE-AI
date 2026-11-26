"use client";

import { Leaf, ShieldAlert, ShieldCheck } from "lucide-react";
import { buildEcoActions } from "@/lib/advisors";
import { classifyUsAqi, formatMetricValue } from "@/lib/aqi";
import { formatLocationLabel } from "@/lib/locations";
import type { AirQualityReport, RecommendationPriority } from "@/lib/types";

interface EcoActionsSectionProps {
  report: AirQualityReport;
}

const PRIORITY_STYLES: Record<RecommendationPriority, string> = {
  high: "border-teal-500/40 bg-teal-500/15 text-teal-200",
  medium: "border-slate-600 bg-slate-800/70 text-slate-200",
  low: "border-slate-700 bg-slate-900/70 text-slate-300",
};

export function EcoActionsSection({ report }: EcoActionsSectionProps) {
  const actions = buildEcoActions(report);
  const classification = classifyUsAqi(report.current.usAqi);
  const isPollutedGuardActive =
    classification.isUnhealthyOrWorse || (report.current.usAqi ?? 0) > 150;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-6 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Leaf className="h-5 w-5 text-teal-400" aria-hidden="true" />
              Eco Action Planner
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Responsible daily habits to lower urban emissions around{" "}
              <span className="font-semibold text-white">
                {formatLocationLabel(report.location)}
              </span>{" "}
              without compromising personal air safety.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
            Modelled US AQI: {formatMetricValue(report.current.usAqi, 0)} (
            {classification.category})
          </span>
        </div>

        {/* Explicit Health-First Guard Banner */}
        <div
          role="note"
          className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-xs ${
            isPollutedGuardActive
              ? "border-amber-500/50 bg-amber-950/40 text-amber-100"
              : "border-teal-500/30 bg-teal-950/30 text-slate-200"
          }`}
        >
          {isPollutedGuardActive ? (
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
              aria-hidden="true"
            />
          ) : (
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-teal-400"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="font-semibold">
              {isPollutedGuardActive
                ? "Health-First Active-Travel Guard Triggered"
                : "Air-Safe Eco Guidance Active"}
            </p>
            <p className="mt-0.5 opacity-90">
              {isPollutedGuardActive
                ? "Because modelled US AQI is above 150 (Unhealthy or worse), AIRWISE explicitly advises against outdoor walking or cycling just to cut emissions. Choose enclosed electric/public transit or remote alternatives instead."
                : "AIRWISE never fabricates exact CO₂ savings and automatically restricts outdoor walking/cycling recommendations whenever AQI reaches unhealthy levels."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                    PRIORITY_STYLES[item.priority]
                  }`}
                >
                  {item.priority} impact
                </span>
                {!item.safeNow && (
                  <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
                    Safety override active
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white">{item.title}</h3>

              <div className="space-y-2 text-xs leading-relaxed">
                <p className="text-slate-100">
                  <span className="font-semibold text-teal-300">
                    What to do:{" "}
                  </span>
                  {item.whatToDo}
                </p>
                <p className="text-slate-300">
                  <span className="font-semibold text-slate-200">
                    Likely environmental benefit:{" "}
                  </span>
                  {item.environmentalBenefit}
                </p>
                <p className="text-amber-200/90">
                  <span className="font-semibold text-amber-300">
                    Personal air-safety note:{" "}
                  </span>
                  {item.airSafetyGuard}
                </p>
              </div>
            </div>

            <p className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              {item.supportingData}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
