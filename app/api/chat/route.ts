import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamAnswer } from "@/lib/rag";
import type { ChatStreamEvent } from "@/types/rag";

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

  const encoder = new TextEncoder();

  // Streaming means the 200 status is committed the moment the body starts
  // flowing, so a failure partway through (e.g. Gemini errors after
  // citations already streamed) can't become an HTTP error status — it has
  // to be an in-band { type: "error" } event instead.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        for await (const event of streamAnswer(parsed.data.query, parsed.data.category)) {
          send(event);
        }
      } catch (err) {
        console.error("Chat stream error:", err);
        send({ type: "error", message: "Failed to generate an answer. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
