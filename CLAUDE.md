# LandUK — project spec & context

Portfolio demo, not production. An AI relocation copilot for people moving to
the UK: a RAG chat agent over curated gov.uk/ONS content, a rule-based
neighbourhood matcher, and a cost-of-living calculator.

Resume line this project is built to support: *"LandUK, AI Relocation
Copilot (Next.js, TypeScript, Gemini, pgvector, RAG). An AI assistant for
people moving to the UK: personalised visa-route guidance, lifestyle-based
neighbourhood matching, and a cost-of-living calculator, powered by a
retrieval-augmented agent over official UK Government sources with cited
answers."*

## Current status (as of last session)

**Fully working end-to-end and verified live** — not just typechecked, actually
exercised with real API calls:
- Chat (`/chat`, `POST /api/chat`) — tested with real questions (Skilled
  Worker visa points, Council Tax banding), returns accurate cited answers.
- Neighbourhood matcher (`/neighbourhoods`, `POST /api/neighbourhoods`) —
  pure logic, no external calls, tested via curl.
- Cost-of-living calculator (`/cost-of-living`, `POST /api/cost-of-living`)
  — pure logic, tested via curl.
- Supabase project is live (`documents` table + `match_documents` RPC), 40
  chunks ingested from the 7 markdown files in `data/sources/`.
- `.env.local` has real working Gemini + Supabase credentials (gitignored,
  never commit it).
- Committed and pushed to GitHub: `https://github.com/Shravan45/landuk`
  (commit `cf677fd "builds mvp"`, on top of the original scaffold commit).
- **Deployed to Vercel, live in production**: `https://landuk.vercel.app`
  (Vercel project `brewed-entropy/landuk`). All three routes verified live
  against production against real Gemini + Supabase, not just built —
  `/api/chat`, `/api/neighbourhoods`, `/api/cost-of-living` all tested with
  real requests post-deploy. `GEMINI_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` are set on both the Production and Preview
  environments in Vercel (`vercel env ls` to check). Deploys are currently
  **manual** (`vercel --prod` from this machine) — the CLI's attempt to
  auto-connect the GitHub repo for deploy-on-push failed ("Failed to connect
  Shravan45/landuk to project") and was never followed up. If you want
  deploy-on-push, that needs the Vercel GitHub App authorized from the
  Vercel dashboard (Project Settings → Git), not the CLI.
- `.vercel/` exists locally (project link config) — gitignored, machine-local,
  fine to regenerate with `vercel link` if missing.

**Not yet done:**
- Deploy-on-push isn't wired up (see above) — every deploy is a manual
  `vercel --prod` from whichever machine has the CLI linked.
- No tests.
- No auth/rate-limiting on the API routes — this now matters more than it
  did pre-deployment, since the app has a real public URL
  (`landuk.vercel.app`) with a live Gemini key attached. Nothing currently
  stops someone from hammering `/api/chat` and burning through the Gemini
  free tier or Supabase usage.
- Custom domain not set up (still on the default `*.vercel.app` URL).

## Tech stack & why

- **Next.js 14 (App Router) + TypeScript** — matches the resume bullet,
  standard `create-next-app` scaffold, nothing exotic.
- **Gemini, not Claude API** — user has a Claude.ai subscription but not
  separate Anthropic API billing; Gemini has a usable free tier. Deliberate
  choice, discussed explicitly with the user — don't "fix" this by swapping
  to Claude API without asking first.
  - `@google/genai` (the current, actively-maintained unified Google SDK) —
    **not** `@google/generative-ai` (older, was tried first, is now
    deprecated/stale and doesn't support `outputDimensionality`). If you see
    `@google/generative-ai` anywhere, that's leftover/wrong — it was fully
    removed.
  - Embedding model: `gemini-embedding-001`, truncated to 768 dimensions via
    `config: { outputDimensionality: 768 }` on every embed call (both
    `lib/gemini.ts` and `scripts/ingest.mjs` — **keep these two in sync**,
    the dimension is hardcoded in both places and also baked into the
    Postgres `vector(768)` column, so changing one without the others breaks
    retrieval silently, not with an error).
  - Generation model: `gemini-flash-latest` (an alias, not a pinned version
    — deliberate, so this doesn't silently break on the next Gemini model
    deprecation the way `text-embedding-004` already has once).
  - **Known trap**: the assistant's training knowledge of "current" Gemini
    model names was stale by the time this was built (cutoff was ~6 months
    behind the actual date). `text-embedding-004` no longer exists. If a
    future session gets a "model not found" error from Gemini, don't guess a
    replacement name — hit `GET https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY`
    to see what's actually live before changing model strings.
- **Supabase (Postgres + pgvector)** for the vector store — free tier,
  `documents` table + `match_documents(query_embedding, match_count,
  filter_category)` cosine-similarity RPC. Schema lives in
  `supabase/schema.sql` and is *not* applied automatically — it was run
  manually in the Supabase SQL editor. If you ever need to recreate the
  project, that file is the source of truth; re-run it there.
- **Curated content, not live scraping** — `data/sources/*.md` are
  hand-written summaries citing real gov.uk/ONS URLs, not scraped. Chosen
  deliberately over live fetching (avoids scraping brittleness/ToS issues
  for a demo) and over synthetic data (citations point to real pages).
  Figures are explicitly caveated as indicative/illustrative throughout —
  this was intentional given the assistant's training cutoff means specific
  fee/threshold numbers could already be stale; the system prompt in
  `lib/rag.ts` instructs Gemini to never state a numeric figure not present
  in the sources.

## Architecture

```
app/
  page.tsx                    Landing page
  chat/page.tsx                Chat UI (client component, markdown rendering via react-markdown)
  neighbourhoods/page.tsx      Matcher form + results (client component)
  cost-of-living/page.tsx      Calculator form + results (client component)
  api/chat/route.ts            POST — RAG chat endpoint
  api/neighbourhoods/route.ts  GET (tags/cities) + POST (matching)
  api/cost-of-living/route.ts  POST — calculator
lib/
  gemini.ts        Gemini client — embedText(), embedTexts(), generateAnswer()
  supabase.ts       Server-only Supabase client (service_role key, bypasses RLS)
  rag.ts            Retrieval (embed query -> match_documents RPC) + prompt construction + citations
  neighbourhoods.ts  Deterministic scoring matcher (tag overlap + budget fit + commute fit)
  cost-of-living.ts  Deterministic calculator (rent + council tax + utilities, scaled by area cost index)
data/
  sources/*.md       Curated visa + cost-of-living content, chunked by ## heading at ingest time
  neighbourhoods.json Curated dataset of ~20 UK areas with tags/rent/commute
scripts/ingest.mjs   Chunk -> embed -> upsert pipeline. Plain ESM (not TS) — see note below.
supabase/schema.sql  pgvector schema + match_documents RPC (apply manually via Supabase SQL editor)
types/rag.ts         Shared TS types for the RAG response shape
```

**Why `scripts/ingest.mjs` is plain JS, not TypeScript**: avoids needing
`tsx`/`ts-node` (which had engine-compatibility warnings on this machine's
old Node version — see below) just to run a one-off admin script. It's
self-contained and doesn't import from `lib/` (path aliases like `@/lib/...`
don't resolve under plain `node` without a bundler), so `lib/gemini.ts` and
`scripts/ingest.mjs` independently duplicate the same embedding call shape.
If you change the embedding logic in one, check whether the other needs the
same change.

## Neighbourhood matcher scoring (lib/neighbourhoods.ts)

Deliberately rule-based, not LLM-based — deterministic, fast, and fully
testable without API calls. Score out of ~100:
- Tag overlap: up to 60 points (fraction of user's selected priority tags
  that the neighbourhood has)
- Budget fit: up to 25 points (full marks at/under budget, tapers off above)
- Commute fit: up to 15 points (full marks at/under max commute, tapers off)

## Cost-of-living calculator (lib/cost-of-living.ts)

Also deterministic. Baseline figures are London averages (from
`data/sources/cost-general.md` / `cost-council-tax.md`), scaled by each
neighbourhood's `costIndex` (London = 100) from `data/neighbourhoods.json`.
Council Tax uses the real England banding multiplier system (Band D = 1x,
Band A = 6/9, Band H = 18/9) applied to an indicative UK-average Band D
figure, with the standard 25% single-occupant discount.

## Known environment gotcha: Node version

Local Node is **v19.8.1** — an old, odd-numbered (non-LTS), EOL release.
Supabase's JS SDK (and several other deps) want Node ≥20 or ≥22 and print
`EBADENGINE` warnings on every install; this is harmless for `npm install`
but caused one real runtime failure: `@supabase/supabase-js` initializes a
realtime sub-client at construction time that needs a global `WebSocket`
(only native in Node ≥22). Fixed by explicitly passing a `ws`-package
polyfill via `realtime: { transport: WebSocket }` in **both**
`lib/supabase.ts` and `scripts/ingest.mjs` (with a `WebSocketLikeConstructor`
type cast in the `.ts` version — see the comment there for why). We don't
use any realtime/subscription features, only REST table reads and RPC calls,
so this is a correct fix, not a workaround masking a real bug.

If more Node-version friction shows up, the actual fix is upgrading Node
(ideally via `nvm`, which isn't installed either — `brew install nvm` or
similar), not more polyfilling. Flagged to the user already; hasn't been
acted on. Ask before doing it — it's an environment change outside this
project's own files.

## Conventions / style established so far

- Tailwind only, no component library. Indigo as the accent colour, slate
  for neutrals. Dark mode via `prefers-color-scheme` (Tailwind's default
  `media` strategy — not manually toggled).
- API routes validate input with `zod` and return `{ error, details? }` with
  a 400 on validation failure, a friendly 500 message on internal failure
  (never leak raw error internals to the client — see `app/api/chat/route.ts`).
- No comments explaining *what* code does; comments only where there's a
  non-obvious *why* (see e.g. the WebSocket polyfill comment, the 768-dim
  sync note). Keep following this if you add code.

## Ideas for what's next (not decided — ask the user before building)

Untriaged possibilities, not a committed roadmap:
- Wire up deploy-on-push (Vercel dashboard → Project Settings → Git →
  authorize the GitHub App for `Shravan45/landuk`) so pushes to `main`
  auto-deploy instead of requiring manual `vercel --prod`.
- Rate-limit `/api/chat` — now higher priority since the app has a live
  public URL (`landuk.vercel.app`) with a real Gemini key behind it.
- Expand `data/sources/` — more visa routes (family visas, Ancestry visa,
  Innovator Founder), more neighbourhoods, or region-specific cost data
  (Scotland/Wales/NI have different Council Tax and rates systems).
- Streaming responses in the chat UI instead of waiting for the full answer
  (currently a single non-streamed `generateContent` call — noticeably slow,
  ~10–25s per query in testing).
- Persist chat history (currently in-memory React state only, lost on
  refresh).
- Custom domain instead of the default `*.vercel.app` URL.
- Tests — there are none. If added, the deterministic modules
  (`lib/neighbourhoods.ts`, `lib/cost-of-living.ts`) are the easy/valuable
  ones to start with since they need no mocking.

## First things to do in a new session

1. `git status` — confirm the working tree is clean and matches what's
   pushed to `github.com/Shravan45/landuk` before assuming anything.
2. `npm run dev` and hit `/chat`, `/neighbourhoods`, `/cost-of-living`
   locally, or just check `https://landuk.vercel.app` directly — it's live.
   Supabase free tier projects can pause after inactivity, so if `/api/chat`
   500s, check the Supabase dashboard first before assuming code broke.
3. If you make changes and want them live, remember deploys are **manual**:
   `vercel --prod` from a machine with the project linked (`.vercel/` present,
   or re-run `vercel link`). Pushing to GitHub alone does *not* deploy.
4. Read `README.md` for the human-facing setup instructions (this file is
   the agent-facing "why" companion to that).
