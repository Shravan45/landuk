import { GoogleGenAI } from "@google/genai";

// gemini-embedding-001 defaults to 3072 dims; truncate to 768 to match the
// pgvector column in supabase/schema.sql.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const GENERATION_MODEL = "gemini-flash-latest";

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

export async function* streamAnswer(prompt: string): AsyncGenerator<string> {
  const client = getClient();
  const stream = await client.models.generateContentStream({
    model: GENERATION_MODEL,
    contents: prompt,
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
