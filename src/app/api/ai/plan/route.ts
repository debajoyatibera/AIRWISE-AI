import { NextRequest, NextResponse } from "next/server";
import { generateDailyPlan } from "@/lib/gemini";
import { PlanRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const parsed = PlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid daily planner input.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const plan = await generateDailyPlan(
      parsed.data.report,
      parsed.data.preferences
    );
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[AIRWISE] Plan generation unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to generate daily plan right now." },
      { status: 500 }
    );
  }
}
