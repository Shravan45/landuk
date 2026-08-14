import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamAnswer, RetrievalError } from "@/lib/rag";
import { ModelUnavailableError } from "@/lib/gemini";
import type { ChatStreamEvent } from "@/types/rag";

function clientMessage(err: unknown): string {
  if (err instanceof ModelUnavailableError) {
    return "The AI model is busy right now and turned away several retries. This is a temporary capacity limit, not a problem with your question — please try again in a minute.";
  }
  if (err instanceof RetrievalError) {
    return "Couldn't reach the source index, so there's nothing to ground an answer in. Please try again shortly.";
  }
  return "Failed to generate an answer. Please try again.";
}

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
      // A client that navigates away mid-answer closes the controller under
      // us; enqueueing into it then throws and would otherwise surface as an
      // unhandled error on every abandoned request.
      let closed = false;
      const send = (event: ChatStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          closed = true;
        }
      };

      try {
        for await (const event of streamAnswer(parsed.data.query, parsed.data.category)) {
          send(event);
          if (closed) return;
        }
      } catch (err) {
        console.error("Chat stream error:", err);
        send({ type: "error", message: clientMessage(err) });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // Already closed by the client disconnecting.
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
