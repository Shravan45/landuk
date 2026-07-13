import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { WebSocketLikeConstructor } from "@supabase/realtime-js";
import WebSocket from "ws";

let cachedClient: SupabaseClient | null = null;

/**
 * Server-only client using the service role key — bypasses RLS so the
 * ingestion script and RAG retriever can read/write the documents table.
 * Never import this from client components.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Add them to .env.local."
    );
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
    // Node < 22 has no global WebSocket, which the realtime-js sub-client
    // requires at construction time even though we never use realtime
    // features here (only REST table reads and RPC calls).
    realtime: {
      // ws's TS types don't structurally match realtime-js's constructor
      // signature exactly, but it's runtime-compatible for our use.
      transport: WebSocket as unknown as WebSocketLikeConstructor,
    },
  });
  return cachedClient;
}
