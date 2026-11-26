# AIRWISE AI — Setup, Testing & Deployment Guide

## Prerequisites

- **Node.js:** v20+ recommended (verified on Node `v24.22.2` and npm `11.19.1` in GitHub Codespaces)
- **npm:** v10+
- **Optional:** A Google Gemini API key from Google AI Studio (`GEMINI_API_KEY`)

---

## 1. Local / GitHub Codespaces Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your environment file from the template:
   ```bash
   cp .env.example .env.local
   ```

3. Configure Gemini (optional — app runs with a clearly labelled rule-based fallback if omitted):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
   > **Security note:** Never prefix `GEMINI_API_KEY` with `NEXT_PUBLIC_`. Keep it server-side only.

4. Start the development server:
   ```bash
   npm run dev
   ```
   In GitHub Codespaces, open the forwarded port `3000` preview URL.

---

## 2. Testing, Linting & Production Build

Run the unit test suite (Vitest):
```bash
npm test
```

Run ESLint checks:
```bash
npm run lint
```

Run the Next.js production build and start the production server:
```bash
npm run build
npm run start
```

---

## 3. Deploying to Vercel

1. Push your repository to GitHub (or connect your GitHub repository directly inside the Vercel dashboard).
2. In Vercel Project Settings → **Environment Variables**, add:
   - `GEMINI_API_KEY` (your server-side Gemini key)
   - `GEMINI_MODEL` (for example `gemini-2.5-flash`)
3. Keep the default Vercel Next.js build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Deploy. Once live, verify `/api/health` reports `geminiConfigured: true` (when key is set) and confirm the Dashboard loads modelled air-quality estimates for Kolkata.

---

## Troubleshooting

- **Rule-Based Fallback Banner Appears:** Check that `GEMINI_API_KEY` is set in `.env.local` (local) or Vercel Environment Variables (production) and restart the server.
- **Open-Meteo Request Error:** Check outbound network connectivity from the server runtime and click **Retry** in the UI.
