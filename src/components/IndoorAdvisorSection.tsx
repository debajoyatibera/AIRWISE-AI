"use client";

import { Home, ShieldCheck, Wind } from "lucide-react";
import { buildIndoorGuidance } from "@/lib/advisors";
import { classifyUsAqi, formatMetricValue } from "@/lib/aqi";
import { formatLocationLabel } from "@/lib/locations";
import type { AirQualityReport, RecommendationPriority } from "@/lib/types";

interface IndoorAdvisorSectionProps {
  report: AirQualityReport;
}

const PRIORITY_STYLES: Record<RecommendationPriority, string> = {
  high: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  medium: "border-teal-500/40 bg-teal-500/15 text-teal-200",
  low: "border-slate-600 bg-slate-800/70 text-slate-300",
};

export function IndoorAdvisorSection({ report }: IndoorAdvisorSectionProps) {
  const guidance = buildIndoorGuidance(report);
  const classification = classifyUsAqi(report.current.usAqi);
  const bestWindow = report.lowerPollutionWindows[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Home className="h-5 w-5 text-teal-400" aria-hidden="true" />
              Indoor Air Advisor
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Practical household air management calibrated to{" "}
              <span className="font-semibold text-white">
                {formatLocationLabel(report.location)}
              </span>{" "}
              (Modelled US AQI {formatMetricValue(report.current.usAqi, 0)} ·{" "}
              {classification.category}).
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-teal-500/30 bg-teal-950/40 px-4 py-3 text-xs">
            <Wind className="h-5 w-5 shrink-0 text-teal-400" aria-hidden="true" />
            <div>
              <div className="font-semibold text-teal-200">
                Balanced Ventilation Rule
              </div>
              <div className="text-slate-300">
                {bestWindow
                  ? `Next cleanest cross-ventilation window: ${bestWindow.label} (avg AQI ~${formatMetricValue(bestWindow.avgUsAqi, 0)}).`
                  : "Never keep windows closed indefinitely—use short 10–15 min ventilation during cleaner daylight hours."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {guidance.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-md"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.statusLabel}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                    PRIORITY_STYLES[item.priority]
                  }`}
                >
                  {item.priority} priority
                </span>
              </div>

              <h3 className="text-base font-bold text-white">{item.title}</h3>

              <div className="space-y-2 text-xs leading-relaxed">
                <p className="text-slate-100">
                  <span className="font-semibold text-teal-300">Action: </span>
                  {item.whatToDo}
                </p>
                <p className="text-slate-300">
                  <span className="font-semibold text-slate-200">Why: </span>
                  {item.whyRecommended}
                </p>
              </div>
            </div>

            <p className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-amber-200/90">
              <span className="font-semibold text-amber-300">
                Outdoor context:{" "}
              </span>
              {item.supportingData}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
