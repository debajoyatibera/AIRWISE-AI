# AIRWISE AI — System Architecture

## Overview

AIRWISE AI follows a secure, server-mediated Next.js App Router architecture. Browser components never hold API credentials or call Gemini directly; instead, typed Next.js Route Handlers validate inputs, fetch and cache Open-Meteo atmospheric data, and invoke Google Gemini (or the deterministic fallback engine) on the server.

```text
Browser UI (React Client Components)
  ├── DashboardSection (AQI cards, Lower-Pollution Windows, Recharts)
  ├── DailyPlannerSection (Profiles + Structured 6-part Daily Plan)
  ├── IndoorAdvisorSection (7 Household Topics, Timed Ventilation)
  ├── EcoActionsSection (Health-Guarded Eco Actions)
  ├── AskAirwiseSection (Grounded Q&A + Example Prompts)
  └── AboutSection (API Attribution, US AQI Scale, Limitations)
        │
        ▼  Typed JSON / Zod-validated API Calls
Next.js App Router API Routes (src/app/api/*)
  ├── GET  /api/locations     ──► Open-Meteo Geocoding API (10m TTL cache)
  ├── GET  /api/air-quality   ──► Open-Meteo Air Quality API (5m TTL cache)
  ├── POST /api/ai/plan       ──► Gemini (@google/genai) or Rule-Based Fallback
  ├── POST /api/ai/ask        ──► Gemini (@google/genai) or Rule-Based Fallback
  └── GET  /api/health        ──► Server capability check (no secret exposure)
```

## Key Modules

| Path | Responsibility |
| --- | --- |
| `src/lib/types.ts` | Shared TypeScript interfaces for locations, pollutant snapshots, hourly series, planner responses, and assistant answers. |
| `src/lib/locations.ts` | Default location (Kolkata), Indian city presets (Delhi, Mumbai, Bengaluru, Chennai), and label formatting. |
| `src/lib/aqi.ts` | EPA US AQI classification (`Good` through `Hazardous` + `Unavailable`), pollutant metadata, past/forecast splitting, and cleanest 2-hour forecast window detection. |
| `src/lib/cache.ts` | Bounded in-memory TTL cache (`TtlCache<T>`) preventing redundant external API calls. |
| `src/lib/open-meteo.ts` | Zod-validated Open-Meteo Geocoding and Air Quality fetchers with request timeouts and `null`-safe handling of missing variables. |
| `src/lib/advisors.ts` | Deterministic Indoor Air Advisor (7 topics) and Eco Action Planner (6 categories) with explicit safety guards. |
| `src/lib/fallback-ai.ts` | Rule-based Daily Planner and Ask AIRWISE fallback engines used whenever `GEMINI_API_KEY` is unset or unreachable. |
| `src/lib/gemini.ts` | Server-side `@google/genai` integration using structured JSON output, strict grounding rules, and automatic fallback on error. |
| `src/lib/validators.ts` | Zod input schemas enforcing coordinate bounds, string lengths, and enum safety across API routes. |

## API Integrations

1. **Open-Meteo Geocoding API** (`https://geocoding-api.open-meteo.com/v1/search`)
   - Resolves user city queries (`name`, `count=8`, `language=en`, `format=json`) to coordinates and local timezones.
2. **Open-Meteo Air Quality API** (`https://air-quality-api.open-meteo.com/v1/air-quality`)
   - Requests `current` and `hourly` variables: `us_aqi`, `pm2_5`, `pm10`, `ozone`, `nitrogen_dioxide` with `past_days=1`, `forecast_days=2`, and `timezone=auto`.
   - Splits the hourly timeline around `current.observedAt` into `past24Hours` (24-hour trend) and `next24Hours` (hourly forecast + cleanest windows).
3. **Google Gemini API (`@google/genai`)**
   - Configured via `GEMINI_API_KEY` and `GEMINI_MODEL` (default `gemini-2.5-flash`).
   - Uses `responseMimeType: "application/json"` and Zod output validation so responses stay structured, grounded in supplied Open-Meteo readings, and free of invented measurements or clinical diagnoses.

## Security & Reliability Controls

- **Zero Client Key Exposure:** `GEMINI_API_KEY` is read strictly on the server inside `src/lib/gemini.ts` and `/api/health` only returns a boolean `geminiConfigured`.
- **Schema Validation:** Every POST body and coordinate query is validated with Zod before upstream calls.
- **Graceful Degradation:** Missing or unavailable pollutant metrics render cleanly as `Unavailable`; upstream failures surface retry controls; missing/failing Gemini keys trigger an explicitly labelled rule-based fallback.
