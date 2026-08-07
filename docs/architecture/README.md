# Architecture — Construction Matchmaker

This directory is the source of truth for how the app is designed. It's meant
to be read top-to-bottom by anyone (human or agent) picking up the project.

## Contents

| File | What it covers |
|---|---|
| [`overview.md`](./overview.md) | System diagram, request lifecycle in one glance, tech-stack rationale |
| [`data-model.md`](./data-model.md) | `Crew` and `SearchLog` schemas, indexes, why each field exists |
| [`search-flow.md`](./search-flow.md) | Step-by-step of what happens when a contractor hits "Find Crew" |
| [`llm-integration.md`](./llm-integration.md) | Groq setup, parsing prompt, rationale prompt, fallback strategy |
| [`seeding.md`](./seeding.md) | How the 10,000 crew records are generated and distributed |
| [`api.md`](./api.md) | Endpoint contracts — request/response shapes |
| [`frontend.md`](./frontend.md) | Single-page React app structure and state flow |
| [`future-work.md`](./future-work.md) | Out-of-scope items (auth, analytics, cost, availability, vector search) with approach notes |

## How to keep this current

- If you change a data model, update `data-model.md` **in the same commit** as
  the schema change.
- If you change the request lifecycle, update `search-flow.md`.
- If you add a new prompt or swap models, update `llm-integration.md`.
- If you add a new endpoint, update `api.md`.
- If you touch the seed distribution, update `seeding.md`.

Docs and code drift is the enemy — the goal is that this directory can be read
in 15 minutes and give a complete mental model of the system.

## Project context

This is a 4-hour timed trial project for Lemonlight. The build will be demoed
and dissected on a 1-hour interview call, so every technical choice must be
defensible on latency, cost, and how it would evolve past MVP. `future-work.md`
is intentionally comprehensive because those topics *will* come up in the
follow-up questions block of the call.
