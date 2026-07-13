import { getSupabaseClient } from "./supabase";
import { embedText, generateAnswer } from "./gemini";
import type { ChatResponse, DocumentCategory, MatchedDocument } from "@/types/rag";

const MATCH_COUNT = 5;

async function retrieveDocuments(
  query: string,
  category?: DocumentCategory
): Promise<MatchedDocument[]> {
  const embedding = await embedText(query);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: MATCH_COUNT,
    filter_category: category ?? null,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []) as MatchedDocument[];
}

function buildPrompt(query: string, documents: MatchedDocument[]): string {
  const context = documents
    .map(
      (doc, i) =>
        `[${i + 1}] ${doc.title} (${doc.source_url})\n${doc.content}`
    )
    .join("\n\n---\n\n");

  return `You are LandUK, an AI assistant that helps people relocating to the UK understand visa routes and cost of living. Answer the user's question using ONLY the numbered sources below. Do not use outside knowledge or make up figures.

Rules:
- Cite sources inline using their number in square brackets, e.g. [1].
- If the sources don't fully answer the question, say what's missing and suggest checking the official gov.uk page directly.
- Be concise and practical. Use short paragraphs or bullet points.
- Never state a fee, threshold, or numeric figure that is not present in the sources — say figures may have changed and should be verified on gov.uk if the sources only give indicative ranges.

Sources:
${context}

Question: ${query}

Answer:`;
}

export async function answerQuestion(
  query: string,
  category?: DocumentCategory
): Promise<ChatResponse> {
  const documents = await retrieveDocuments(query, category);

  if (documents.length === 0) {
    return {
      answer:
        "I don't have any indexed sources to answer that yet. Try asking about visa routes (Skilled Worker, Global Talent, Student, Youth Mobility, Health and Care Worker) or cost of living (rent, council tax, utilities).",
      citations: [],
    };
  }

  const prompt = buildPrompt(query, documents);
  const answer = await generateAnswer(prompt);

  const citations = documents.map((doc) => ({
    title: doc.title,
    source_url: doc.source_url,
  }));

  return { answer, citations };
}
