# AIRWISE AI — Submission Story

## Why We Built AIRWISE AI

Across major Indian and global cities, millions of residents check an AQI number every morning—and still face the same everyday questions: *Is it safe for my child to play outside? Should I open the bedroom windows right now, or wait until afternoon? Should I walk to the metro or take enclosed transit?*

Most tools either stop at a raw AQI badge or offer generic chatbot replies disconnected from local hourly forecasts. **AIRWISE AI** was designed to turn modelled atmospheric data into calm, structured, health-first daily decisions.

## Design & Engineering Principles

1. **Truthful Environmental Data:** AIRWISE integrates live Open-Meteo Geocoding and Air Quality APIs (defaulting to Kolkata with instant switching across Delhi, Mumbai, Bengaluru, Chennai, and global city search). Just as importantly, it never mislabels atmospheric model estimates as physical CPCB station readings, and never fabricates missing measurements or carbon savings.
2. **Practical Daily & Household Intelligence:** Beyond outdoor AQI, urban exposure happens indoors and during commutes. Our Indoor Air Advisor covers timed cross-ventilation, cooking fumes, exhaust fan timing, HEPA filtration, damp dust control, and incense/smoke reduction. Our Eco Action Planner promotes lower-emission transit while enforcing a strict safety guard against recommending outdoor walking or cycling in unhealthy air.
3. **Resilient, Transparent GenAI:** Powered server-side by `@google/genai`, AIRWISE feeds live environmental metrics, forecast windows, and user profile context into structured Gemini responses—and falls back cleanly to a clearly labelled deterministic rule-based engine whenever a Gemini API key is unconfigured or unreachable.

## PromptWars Evaluation Alignment

- **Code Quality:** Modular TypeScript domain libraries (`aqi.ts`, `open-meteo.ts`, `advisors.ts`, `fallback-ai.ts`, `gemini.ts`) with Zod schemas and zero duplicated classification logic.
- **Security:** API keys stay strictly on the server; coordinates, queries, and AI payloads are schema-validated.
- **Efficiency:** Bounded server-side TTL caching for Open-Meteo geocoding and air quality calls reduces latency and upstream load.
- **Testing:** Automated Vitest coverage across EPA US AQI breakpoints, forecast window extraction, indoor/eco safety rules, fallback labelling, and input validation.
- **Accessibility:** High-contrast deep navy/teal/amber UI, skip links, semantic landmarks, keyboard-navigable tabs, and screen-reader status/alert regions.
- **Problem Statement Alignment:** Every section directly serves urban residents navigating daily air-quality decisions.
