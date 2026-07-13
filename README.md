# LandUK — AI Relocation Copilot

A portfolio demo: an AI assistant for people moving to the UK. It combines a
retrieval-augmented (RAG) chat agent over curated UK government sources with
a rule-based neighbourhood matcher and a cost-of-living calculator.

Built with Next.js (App Router, TypeScript), Google Gemini for embeddings and
generation, and Postgres/pgvector via Supabase for the vector store.

> This is a demo project, not a production service. Visa rules and cost
> figures change — always verify against [gov.uk](https://www.gov.uk) and
> [ons.gov.uk](https://www.ons.gov.uk) before relying on anything here.

## Features

- **Ask LandUK** (`/chat`) — cited Q&A over curated visa-route content
  (Skilled Worker, Global Talent, Student, Youth Mobility, Health & Care
  Worker) and cost-of-living reference data, retrieved via pgvector cosine
  similarity and answered by Gemini with inline citations.
- **Neighbourhood matcher** (`/neighbourhoods`) — deterministic scoring over
  a curated dataset of ~20 UK areas, ranked by budget fit, commute, and
  lifestyle tags you pick (nightlife, family-friendly, tech hub, etc).
- **Cost of living calculator** (`/cost-of-living`) — estimates a monthly
  budget (rent, Council Tax, utilities, transport, groceries) scaled to each
  area's relative cost index.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Free tier is fine. In the Supabase SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql)
— it enables the `pgvector` extension, creates the `documents` table, and
adds the `match_documents` similarity-search function.

### 3. Get a Gemini API key

Free tier from [Google AI Studio](https://aistudio.google.com/apikey).

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
(Project Settings → API in the Supabase dashboard — use the `service_role`
key, not the anon key, since ingestion and retrieval both run server-side).

### 5. Ingest the knowledge base

Chunks the markdown sources in `data/sources/`, embeds each chunk with
Gemini, and loads them into Supabase:

```bash
npm run ingest
```

Re-run this any time you edit or add files under `data/sources/`.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/                  Next.js App Router pages + API routes
  api/chat/            POST — RAG chat endpoint
  api/neighbourhoods/  GET (tag/city list) + POST — matcher
  api/cost-of-living/  POST — calculator
lib/                  Core logic (Gemini client, Supabase client, RAG, matching, calculator)
data/sources/         Curated markdown source content (visa routes, cost of living)
data/neighbourhoods.json  Curated neighbourhood dataset
scripts/ingest.mjs    Chunk → embed → upsert pipeline
supabase/schema.sql   pgvector schema + match_documents RPC
```

## Updating the knowledge base

Add a new `.md` file to `data/sources/` with frontmatter:

```markdown
---
title: My source title
source_url: https://www.gov.uk/...
category: visa
---

## A section heading
Content for this section becomes one retrievable chunk.
```

Then run `npm run ingest` again — it clears and reloads the whole
`documents` table from `data/sources/`.
