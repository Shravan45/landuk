-- LandUK schema: RAG knowledge base over pgvector
-- Run this once in the Supabase SQL editor (or `psql` against your project).

create extension if not exists vector;

create table if not exists documents (
  id bigint generated always as identity primary key,
  category text not null check (category in ('visa', 'cost_of_living', 'general')),
  title text not null,
  source_url text not null,
  content text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops);

create index if not exists documents_category_idx on documents (category);

-- Similarity search RPC used by the RAG retriever.
create or replace function match_documents (
  query_embedding vector(768),
  match_count int default 5,
  filter_category text default null
)
returns table (
  id bigint,
  category text,
  title text,
  source_url text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.category,
    documents.title,
    documents.source_url,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where filter_category is null or documents.category = filter_category
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
