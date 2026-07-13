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

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}
