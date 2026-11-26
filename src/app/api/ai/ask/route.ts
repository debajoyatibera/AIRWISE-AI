import { NextRequest, NextResponse } from "next/server";
import { generateAssistantAnswer } from "@/lib/gemini";
import { AssistantRequestSchema } from "@/lib/validators";

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

  const parsed = AssistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid assistant request.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const response = await generateAssistantAnswer(
      parsed.data.question,
      parsed.data.report,
      parsed.data.preferences
    );
    return NextResponse.json({ response });
  } catch (error) {
    console.error("[AIRWISE] Assistant unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to answer question right now." },
      { status: 500 }
    );
  }
}
