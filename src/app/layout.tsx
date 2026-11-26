import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIRWISE AI — Urban Air Quality Assistant",
  description:
    "Environmental intelligence dashboard combining live Open-Meteo modelled air quality data with Google Gemini personalized daily planning, indoor air guidance, and responsible eco actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#071124] text-slate-50 antialiased selection:bg-teal-500/30 selection:text-teal-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950 focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
