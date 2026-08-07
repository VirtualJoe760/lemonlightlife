# System overview

## One-line summary

A general contractor types a one-sentence project description; the app returns
10 ranked matches from a 10,000-person crew database, each annotated with a
one-line rationale for why they fit.

## Component diagram

```
 ┌──────────────────┐        POST /api/search        ┌──────────────────────┐
 │  React SPA       │ ─────────────────────────────▶ │  Express API         │
 │  (Vite, :5173)   │ ◀───────────────────────────── │  (Node 20, :3001)    │
 └──────────────────┘        { results, ... }        └──────────┬───────────┘
                                                                │
                          ┌─────────────────────────────────────┼─────────────────────┐
                          │                                     │                     │
                          ▼                                     ▼                     ▼
                 ┌─────────────────┐               ┌────────────────────┐   ┌──────────────────┐
                 │ Groq            │               │ MongoDB Atlas M0   │   │ MongoDB Atlas M0 │
                 │ (openai/        │               │  ─ crew            │   │  ─ searchlogs    │
                 │  gpt-oss-120b)  │               │    (Atlas Search   │   │    (append-only) │
                 │                 │               │     + 2dsphere)    │   │                  │
                 └─────────────────┘               └────────────────────┘   └──────────────────┘
```

## Request lifecycle (compressed)

1. User types description → clicks Find Crew
2. `POST /api/search { description }`
3. Server calls Groq (`gpt-oss-120b`) with JSON-mode prompt → structured filters
4. Server runs one Mongo aggregation: Atlas Search + `$match` availability + `$geoNear` + score blend + `$limit 10`
5. Server calls Groq once with the top 10 records → gets 10 rationale strings back
6. Server fires `SearchLog.create(...)` (no await) to persist the query for training
7. Server returns `{ results, parsedFilters, latencyMs }`
8. React renders result cards + collapsible "Parsed as" panel

## Tech stack rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React, no state library | 4-hour budget. `useState` + `fetch` covers the single page. |
| Backend | Node 20 + Express + Mongoose | Familiar, minimal boilerplate. `--env-file` avoids a `dotenv` dependency. |
| Database | MongoDB Atlas M0 (free) | Native Atlas Search (BM25) + `$geoNear` in one pipeline stage. No sidecar search service. |
| LLM | Groq · `openai/gpt-oss-120b` | Groq's throughput on gpt-oss-120b is sub-second for our prompt sizes — critical for keeping p95 < 2s across two LLM hops. OpenAI-compatible so we use the `openai` npm SDK. |
| Seed | `@faker-js/faker` + curated vocabularies | Faker for names/dates; hand-curated role + city lists so the search results actually make sense. |

## Latency budget

Target: **p95 < 2s** end-to-end.

| Stage | Budget |
|---|---|
| Network (client → server) | 50 ms |
| Groq parse call | 400 ms |
| Mongo aggregation | 200 ms |
| Groq rationale call (batched, all 10 at once) | 800 ms |
| Serialize + network back | 50 ms |
| **Total** | **~1.5 s** |

`SearchLog.create` is fire-and-forget — it never adds to the response path.

## What's deliberately not in the diagram

Auth, analytics pipelines, availability/calendaring, admin CRUD, and vector
search — all of these are covered as "how would you approach it" in
[`future-work.md`](./future-work.md).
