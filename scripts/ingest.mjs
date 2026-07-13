// Chunks the curated markdown sources in data/sources/, embeds each chunk
// with Gemini, and upserts them into the Supabase `documents` table.
//
// Usage: npm run ingest
//
// Plain ESM (not TypeScript) so it runs directly under `node` without a
// transpiler — the ingestion pipeline is a one-off admin task, not app code.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
const SOURCES_DIR = path.join(__dirname, "..", "data", "sources");
// gemini-embedding-001 defaults to 3072 dims; truncate to 768 to match the
// pgvector column in supabase/schema.sql.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}. Add it to .env.local.`);
  }
  return value;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Source file is missing --- frontmatter ---");
  }
  const [, frontmatterBlock, body] = match;
  const frontmatter = {};
  for (const line of frontmatterBlock.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    frontmatter[key] = value;
  }
  return { frontmatter, body: body.trim() };
}

// Split on top-level `## Heading` sections; each section becomes one chunk.
// Keeps chunks small enough for focused retrieval while preserving the
// surrounding context a heading provides.
function chunkByHeading(body) {
  const lines = body.split("\n");
  const chunks = [];
  let currentHeading = null;
  let currentLines = [];

  const flush = () => {
    const text = currentLines.join("\n").trim();
    if (text) {
      chunks.push(currentHeading ? `${currentHeading}\n${text}` : text);
    }
    currentLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      currentHeading = line;
    } else if (line.startsWith("# ")) {
      // Document title — skip, it's already carried as frontmatter `title`.
      continue;
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return chunks;
}

async function embedText(client, text) {
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

async function main() {
  const geminiKey = requireEnv("GEMINI_API_KEY");
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const genAI = new GoogleGenAI({ apiKey: geminiKey });
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    // Node < 22 has no global WebSocket, which the realtime-js sub-client
    // requires at construction time even though this script never uses
    // realtime features (only REST table writes).
    realtime: { transport: WebSocket },
  });

  const files = (await readdir(SOURCES_DIR)).filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} source files in ${SOURCES_DIR}`);

  const rows = [];
  for (const file of files) {
    const raw = await readFile(path.join(SOURCES_DIR, file), "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const chunks = chunkByHeading(body);

    console.log(`  ${file}: ${chunks.length} chunks`);

    for (const chunk of chunks) {
      const embedding = await embedText(genAI, chunk);
      rows.push({
        category: frontmatter.category,
        title: frontmatter.title,
        source_url: frontmatter.source_url,
        content: chunk,
        embedding,
        metadata: { source_file: file },
      });
    }
  }

  console.log(`Embedded ${rows.length} chunks total. Replacing documents table...`);

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .gte("id", 0);
  if (deleteError) {
    throw new Error(`Failed to clear documents table: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase.from("documents").insert(rows);
  if (insertError) {
    throw new Error(`Failed to insert documents: ${insertError.message}`);
  }

  console.log(`Done. Inserted ${rows.length} documents.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
