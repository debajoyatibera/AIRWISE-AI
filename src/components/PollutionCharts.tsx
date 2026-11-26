"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyPoint } from "@/lib/types";

interface PollutionChartsProps {
  past24Hours: HourlyPoint[];
  next24Hours: HourlyPoint[];
}

export function PollutionCharts({
  past24Hours,
  next24Hours,
}: PollutionChartsProps) {
  const [activeChart, setActiveChart] = useState<"trend" | "forecast">("trend");

  const trendData = past24Hours.map((pt) => ({
    hour: pt.hourLabel,
    "US AQI": pt.usAqi,
    "PM2.5 (µg/m³)": pt.pm25,
    "PM10 (µg/m³)": pt.pm10,
  }));

  const forecastData = next24Hours.map((pt) => ({
    hour: pt.hourLabel,
    "US AQI": pt.usAqi,
    "PM2.5 (µg/m³)": pt.pm25,
    "NO₂ (µg/m³)": pt.nitrogenDioxide,
  }));

  const activeData = activeChart === "trend" ? trendData : forecastData;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-[#0d1b36] p-5 shadow-lg">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            {activeChart === "trend"
              ? "24-Hour Modelled Pollution Trend"
              : "Upcoming 24-Hour Modelled Forecast"}
          </h3>
          <p className="text-xs text-slate-400">
            {activeChart === "trend"
              ? "Trailing 24 hours of Open-Meteo modelled US AQI and PM2.5."
              : "Next 24 hours of Open-Meteo hourly forecast to spot cleaner windows."}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Pollution chart view"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setActiveChart((prev) =>
                prev === "trend" ? "forecast" : "trend"
              );
            }
          }}
          className="inline-flex rounded-xl border border-slate-700 bg-slate-950/60 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeChart === "trend"}
            onClick={() => setActiveChart("trend")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-teal-400 ${
              activeChart === "trend"
                ? "bg-teal-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            24h Trend
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeChart === "forecast"}
            onClick={() => setActiveChart("forecast")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-teal-400 ${
              activeChart === "forecast"
                ? "bg-teal-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Hourly Forecast
          </button>
        </div>
      </div>

      {activeData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-sm text-slate-400">
          Hourly data series is currently unavailable for this location.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === "trend" ? (
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="pmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="hour"
                  stroke="#94a3b8"
                  fontSize={11}
                  interval={2}
                />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#071124",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="US AQI"
                  stroke="#14b8a6"
                  strokeWidth={2.2}
                  fill="url(#aqiGradient)"
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="PM2.5 (µg/m³)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#pmGradient)"
                  connectNulls
                />
              </AreaChart>
            ) : (
              <BarChart
                data={forecastData}
                margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="hour"
                  stroke="#94a3b8"
                  fontSize={11}
                  interval={2}
                />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#071124",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="US AQI" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="PM2.5 (µg/m³)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
