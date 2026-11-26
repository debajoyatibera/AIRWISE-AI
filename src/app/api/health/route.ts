import { NextResponse } from "next/server";
import { getGeminiHealthStatus } from "@/lib/gemini";

export async function GET() {
  return NextResponse.json(getGeminiHealthStatus());
}
