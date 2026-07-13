import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateCostOfLiving } from "@/lib/cost-of-living";

const requestSchema = z.object({
  neighbourhoodId: z.string().min(1),
  bedrooms: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  councilTaxBand: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]),
  adultsInHousehold: z.number().int().positive().max(10),
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
    const breakdown = calculateCostOfLiving(parsed.data);
    return NextResponse.json(breakdown);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Calculation failed" },
      { status: 400 }
    );
  }
}
