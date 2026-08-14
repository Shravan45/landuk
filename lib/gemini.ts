import { GoogleGenAI } from "@google/genai";

// gemini-embedding-001 defaults to 3072 dims; truncate to 768 to match the
// pgvector column in supabase/schema.sql.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const GENERATION_MODEL = "gemini-flash-latest";

// Bound the retrying by wall-clock rather than attempt count: attempts that
// fail fast (503s often come back in under a second) should buy more of them,
// not burn the budget.
// 15s rides out the short 503 bursts that make up most failures without
// leaving the user staring at a spinner through a genuine upstream outage,
// which no amount of retrying fixes.
const RETRY_BUDGET_MS = 15_000;
const BASE_RETRY_DELAY_MS = 600;
const MAX_RETRY_DELAY_MS = 5_000;

export class ModelUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Gemini is unavailable after retries.", { cause });
    this.name = "ModelUnavailableError";
  }
}

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local.");
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

export async function embedText(text: string): Promise<number[]> {
  const client = getClient();
  const result = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const values = result.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Gemini returned no embedding values.");
  }
  return values;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  // Embed sequentially to stay comfortably under free-tier rate limits.
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedText(text));
  }
  return embeddings;
}

function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 503) return true;

  const message = err instanceof Error ? err.message : String(err);
  return /\b(429|500|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(
    message
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* streamAnswer(prompt: string): AsyncGenerator<string> {
  const client = getClient();

  // Gemini's free tier returns 503 UNAVAILABLE in bursts during capacity
  // spikes, often several in a row, so a single attempt fails a large
  // fraction of the time. Retrying is only safe before the first chunk
  // reaches the caller — past that point the client has already rendered
  // text, and starting a new stream would duplicate it.
  const deadline = Date.now() + RETRY_BUDGET_MS;

  for (let attempt = 0; ; attempt++) {
    let emitted = false;
    try {
      const stream = await client.models.generateContentStream({
        model: GENERATION_MODEL,
        contents: prompt,
      });

      for await (const chunk of stream) {
        if (!chunk.text) continue;
        emitted = true;
        yield chunk.text;
      }
      return;
    } catch (err) {
      if (emitted || !isTransient(err)) throw err;

      const delay =
        Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS) +
        Math.random() * 250;
      if (Date.now() + delay >= deadline) throw new ModelUnavailableError(err);

      await sleep(delay);
    }
  }
}
