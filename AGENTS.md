# AGENTS.md — Construction Matchmaker

Crew-matching micro-app for general contractors. Trial project for Lemonlight.

## Brief requirements (must haves)

- [x] Node.js/Express API endpoint that accepts a project description, returns structured ranked crew matches
- [x] Single-page React UI: description input, results list, match rationale
- [x] 10,000 seeded people in MongoDB, covering construction roles across the industry
- [x] Persistent logging of search queries + results (for future training/analysis)
- [x] Search queries complete in a reasonable time (target p95 < 2s)
- [x] Stored booking status per person; filter unavailable

## Out of scope per the brief (talking points prepared in `docs/architecture/future-work.md`)

Auth · Analytics · Cost optimization · Date/time availability

## User-directed deviations (deliberate; call out on the interview)

- **Geography:** Southern California only (LA / Orange / Riverside incl. Coachella Valley / San Bernardino / San Diego / Imperial) — 10k in one region is realistic density and makes geo scoring actually matter. Brief said "throughout the US"; scope narrowed by user request.
- **Extra UI pages:** Home / Chat / Team / Projects / Account (with sidebar). Brief noted "other pages beyond crew search" as out of scope; user wanted them for a stronger demo.
- **Chat endpoint:** `/api/chat` with Groq function calling (LLM invokes a `search_subcontractors` tool) is layered on top of the brief-required `/api/search`. The UI uses `/api/chat`; `/api/search` remains as the direct primitive.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React (SPA with server-rendered shell via Express) |
| Backend | Node 20 + Express + Mongoose |
| Database | MongoDB (local `mongodb://localhost:27017/matchmaker`) |
| LLM (parse + rationale + tool-calling) | Groq · `openai/gpt-oss-120b` |
| Images (one-time gen) | Google Gemini · `gemini-3.1-flash-image` |
| Seed | `@faker-js/faker` + curated SoCal cities + 25 role vocabulary |
| Styling | Tailwind CSS 3.4 + shadcn/ui + Framer Motion |

## Env — only `.env.local` (never `.env`, never `.env.example`)

Server scripts pass `--env-file=../.env.local`. Add new vars directly to that file (gitignored).

- `MONGODB_URI` — Mongo connection string
- `GROQ_API_KEY` — Groq bearer token
- `GEMINI_API_KEY` — only needed for `generate-headshots` / `generate-mockups`
- Optional: `GROQ_BASE_URL`, `GROQ_MODEL`, `PORT` (defaults in `server/src/llm.js` + `server/src/index.js`)

## Dev commands (from repo root)

| Command | What it does |
|---|---|
| `npm run install:all` | Install root + server + client deps |
| `npm run smoke` | Mongo + Groq connectivity check |
| `npm run seed` | Wipe + reseed subcontractors (10k, ~20s) |
| `npm run generate-headshots` | Fill `client/public/headshots/` pool (~40 imgs; add `-- --limit N` for a sample) |
| `npm run generate-mockups` | UI reference mockups to `docs/architecture/ui-references/mockups/` |
| `npm run dev` | Server (`:3001`) + client (`:5173`) concurrently |

## Where things live

- `server/src/ranker.js` — the shared scoring function (30% role / 30% specialization level / 25% geo / 15% rating). Used by both `/api/search` and the `search_subcontractors` tool inside `/api/chat`.
- `server/src/routes/*.js` — endpoint handlers (`search.js`, `chat.js`)
- `server/src/models/{Subcontractor,SearchLog,ChatLog}.js`
- `shared/roles.js` + `shared/cities.js` — canonical vocabularies, imported by seed + server
- `client/src/pages/{Home,Chat,Team,Projects,Account}.jsx`
- `client/src/components/ui/*` — shadcn primitives
- `docs/architecture/` — full design; start at `README.md`
- `docs/architecture/ui-references/` — Tailwind UI paste-ins we're adapting

## Conventions

- ES modules everywhere.
- No comments explaining WHAT code does — only WHY (non-obvious constraints, workarounds, invariants).
- `SearchLog.create` + `ChatLog.create` fire-and-forget — logging never blocks or fails a response.
- LLM errors fall back to regex parser + template rationale — no user-visible 500s.
- Windows absolute paths in tool calls (`F:\web-clients\lemonlight\...`).
- Change a schema / prompt / endpoint / seed distribution → update the matching file under `docs/architecture/` **in the same commit**.
