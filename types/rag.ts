export type DocumentCategory = "visa" | "cost_of_living" | "general";

export interface MatchedDocument {
  id: number;
  category: DocumentCategory;
  title: string;
  source_url: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface Citation {
  title: string;
  source_url: string;
}

// One JSON object per line (NDJSON) streamed from POST /api/chat.
export type ChatStreamEvent =
  | { type: "citations"; citations: Citation[] }
  | { type: "text"; delta: string }
  | { type: "error"; message: string };
