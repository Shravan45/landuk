import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ALL_CITIES, ALL_TAGS, matchNeighbourhoods } from "@/lib/neighbourhoods";

const requestSchema = z.object({
  maxBudget: z.number().positive().optional(),
  maxCommuteMins: z.number().positive().optional(),
  city: z.string().optional(),
  priorities: z.array(z.string()).default([]),
});

export async function GET() {
  return NextResponse.json({ tags: ALL_TAGS, cities: ALL_CITIES });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const matches = matchNeighbourhoods(parsed.data);
  return NextResponse.json({ matches });
}
