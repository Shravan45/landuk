import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/lib/rag";

const requestSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  category: z.enum(["visa", "cost_of_living", "general"]).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const response = await answerQuestion(parsed.data.query, parsed.data.category);
    return NextResponse.json(response);
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Failed to generate an answer. Please try again." },
      { status: 500 }
    );
  }
}
