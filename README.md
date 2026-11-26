# AIRWISE AI — Urban Air Quality Assistant

**PromptWars Virtual Challenge 06 Submission | Official Challenge: Urban Air Quality Assistant**

AIRWISE AI is a full-stack environmental intelligence dashboard built with Next.js App Router, TypeScript, Tailwind CSS, Recharts, Open-Meteo APIs, and the official `@google/genai` SDK. It transforms live modelled atmospheric forecasts into personalized daily schedules, practical indoor air guidance, health-safe eco actions, and grounded Q&A while remaining transparent about modelled data and AI status.

---

## Project Overview

Urban residents frequently see raw AQI scores without knowing how to adjust daily plans—when to ventilate their home, whether outdoor exercise or walking to transit is advisable, or how to protect children, older adults, and respiratory-sensitive household members.

AIRWISE AI solves this by combining:
1. **Live Open-Meteo modelled air-quality data and 24-hour forecasts** (defaulting to Kolkata, with quick switching across Delhi, Mumbai, Bengaluru, Chennai, and global city search).
2. **Server-side Google Gemini personalization** with automatic model failover across supported Gemini models and an explicitly labelled deterministic rule-based fallback when Gemini is unavailable.

---

## Screenshots

> **Note:** Capture and add screenshots of your running local/Codespaces or deployed Vercel build in `docs/screenshots/` before final submission:
> - `Dashboard` (Kolkata modelled US AQI, pollutant cards, lower-pollution forecast windows, and Recharts 24h trend/forecast)
> - `Daily AI Planner` (profile selector + structured 6-part plan with actual Gemini model badge)
> - `Indoor Air Advisor` & `Eco Actions` (timed ventilation & health-guarded active travel)
> - `Ask AIRWISE` (example prompts + grounded environmental answer)

---

## Features

1. **Dashboard**
   - Defaults to **Kolkata** with presets for **Delhi, Mumbai, Bengaluru, and Chennai**, plus global city search via Open-Meteo Geocoding.
   - Displays current modelled **US AQI**, EPA classification badge, **PM2.5**, **PM10**, **Ozone (O₃)**, and **Nitrogen Dioxide (NO₂)**, plus partial/unavailable data notices.
   - Interactive Recharts **24-hour pollution trend** and **upcoming 24-hour hourly forecast**, alongside identified **lower-pollution forecast windows** (accounting for half-hour timezones such as `Asia/Kolkata` and midnight boundaries).
   - Explicitly attributes Open-Meteo values as **modelled atmospheric estimates and forecasts**, never falsely claiming physical CPCB ground monitoring-station readings.

2. **Daily AI Planner**
   - Supports 5 profiles: General adult, Child or family, Older adult, Respiratory-sensitive user, and Outdoor worker.
   - Personalizes guidance from schedule, planned outdoor activities, commuting preference, and routine notes.
   - Generates structured recommendations across 6 sections (Morning, Outdoor Guidance, Cleaner Windows, Commute, Indoor Plan, Evening), each detailing **what to do**, **why recommended**, **supporting environmental data**, and **priority**.

3. **Indoor Air Advisor**
   - Personalized to current outdoor modelled AQI and cleaner forecast windows across 7 household topics: timed ventilation decisions, indoor dust reduction, cooking emissions, exhaust fan use, HEPA filtration, smoke & incense reduction, and household pollution prevention.
   - Explicitly avoids recommending keeping windows closed indefinitely.

4. **Eco Actions**
   - Practical alternatives covering public transportation, carpooling, reducing vehicle idling, combining errands, lower-emission commuting choices, and clean household practices.
   - Enforces a **health-first safety guard**: never recommends outdoor walking or cycling in Unhealthy, Very Unhealthy, or Hazardous conditions (`US AQI >= 151`) merely to cut emissions, and never invents exact carbon savings.

5. **Ask AIRWISE**
   - Grounded Q&A assistant powered by server-side `@google/genai` with example prompts (`Is it safe to exercise outdoors now?`, `What should my family do today?`, `How can I reduce indoor pollution?`, `What does PM2.5 mean?`, `When should I travel today?`).
   - Transparently displays the configured primary model vs. the actual model used (including auto-failover indicators), or a clearly labelled **Rule-Based Fallback** badge when Gemini cannot be reached.

6. **About & Data Sources**
   - In-app transparency for Open-Meteo endpoints, US AQI classification table, live Gemini connection & failover status, and limitations.

---

## Architecture

AIRWISE AI uses a server-mediated Next.js App Router architecture (`src/app/api/*`) so API keys never reach browser code:

- `GET /api/locations` — Zod-validated city lookup via Open-Meteo Geocoding API (10-minute TTL cache).
- `GET /api/air-quality` — Zod-validated air quality retrieval via Open-Meteo Air Quality API (5-minute TTL cache, `past_days=1`, `forecast_days=2`, `timezone=auto`).
- `POST /api/ai/plan` — Personalized daily plan via server-side `@google/genai` with automatic model failover and deterministic fallback.
- `POST /api/ai/ask` — Grounded Q&A via server-side `@google/genai` with automatic model failover and deterministic fallback.
- `GET /api/health` — Non-secret server status reporting `geminiConfigured`, `configuredModel`, `fallbackModels`, `failoverEnabled`, and `lastUsedModel`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full module diagram and data flow.

---

## Technologies

- **Framework & Language:** Next.js App Router (`16.4.6`), React (`19.3.1`), TypeScript
- **Styling & Icons:** Tailwind CSS (`v4`), Lucide React
- **Charts:** Recharts
- **GenAI SDK:** `@google/genai` (server-side only)
- **Validation:** Zod
- **Testing & Linting:** Vitest, ESLint (`eslint-config-next`)

---

## Setup Instructions

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional for rule-based fallback; required for live Gemini)
cp .env.example .env.local
```

Edit `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

> **Security note:** Never prefix `GEMINI_API_KEY` with `NEXT_PUBLIC_` and never commit `.env.local` (ignored by `.gitignore`).

Run locally:
```bash
npm run dev        # Development server at http://localhost:3000
npm test           # Vitest unit tests
npm run lint       # ESLint checks
npm run build      # Production build
npm run start      # Production server
```

See [docs/SETUP.md](docs/SETUP.md) for detailed troubleshooting.

---

## API Sources

- **Open-Meteo Air Quality API:** `https://air-quality-api.open-meteo.com/v1/air-quality` (`us_aqi`, `pm2_5`, `pm10`, `ozone`, `nitrogen_dioxide`)
- **Open-Meteo Geocoding API:** `https://geocoding-api.open-meteo.com/v1/search`
- **Google Gemini API:** Accessed via official `@google/genai` SDK on the server.

---

## Deployment Instructions (Vercel & GitHub Codespaces)

1. Push your branch (`feature/airwise-mvp` or `main`) to GitHub.
2. Import the repository in **Vercel** using the default Next.js preset (`npm run build`).
3. Add `GEMINI_API_KEY` and `GEMINI_MODEL` in Vercel **Project Settings → Environment Variables**.
4. Deploy and verify `/api/health` returns `geminiConfigured: true`.

In **GitHub Codespaces**, run `npm run dev` (or `npm run build && npm run start`) and open the forwarded port `3000` preview URL.

---

## Known Limitations

- **Modelled Estimates vs. Physical Sensors:** Open-Meteo relies on global atmospheric models (such as Copernicus CAMS), not physical CPCB or hyper-local roadside monitoring stations. Street-canyon pollution can differ from grid estimates.
- **Session-Only UI State:** User profile preferences and Ask AIRWISE conversation history are stored in client memory for the current browser session (no backend database).
- **Per-Instance Caching & Telemetry:** Server-side TTL caches and `lastUsedModel` tracking live in per-instance memory and reset on server restarts or serverless cold starts.
- **Not Medical Advice:** AIRWISE AI offers environmental decision support only and does not provide medical diagnosis or clinical recommendations.
