# AGENTS.md — Construction Matchmaker

Canonical context file for anyone (human or agent) working in this repo.
This is the single source of truth for project shape, workflow, and
conventions. Deeper architectural detail lives in
[`/docs/architecture/`](./docs/architecture/README.md).

## What this is

A 4-hour timed-trial project for **Lemonlight**. A crew-matching micro-app
for general contractors: contractor types a one-sentence project
description → app returns 10 ranked crew matches from a 10,000-person
MongoDB database, each with an LLM-generated rationale.

The build will be demoed and pressed on during a 1-hour interview call. Every
technical decision must be defensible on latency, cost, and how it would
evolve past MVP. `/docs/architecture/future-work.md` prepares talking points
for the "how would you approach X" follow-up questions.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React (single page, no state library) |
| Backend | Node 20 + Express + Mongoose |
| Database | MongoDB Atlas M0 (free), Atlas Search + `2dsphere` |
| LLM | **Groq** · `openai/gpt-oss-120b`, OpenAI-compatible SDK |
| Seed | `@faker-js/faker` + curated role/city vocabularies |
| Dev orchestration | `concurrently` at repo root |

Env-var contract (see `.env.example`):

- `MONGODB_URI` — Atlas connection string
- `GROQ_API_KEY` — Groq bearer token
- `GROQ_BASE_URL` — defaults to `https://api.groq.com/openai/v1`
- `GROQ_MODEL` — defaults to `openai/gpt-oss-120b`
- `PORT` — server port, defaults to 3001

## Repo layout

```
F:\web-clients\lemonlight\
├── AGENTS.md              # this file
├── CLAUDE.md              # thin pointer to AGENTS.md
├── .env                   # gitignored, user-populated
├── .env.example           # template
├── .gitignore
├── package.json           # root — dev scripts, concurrently
├── docs/
│   └── architecture/      # full architectural spec
│       ├── README.md      # index
│       ├── overview.md
│       ├── data-model.md
│       ├── search-flow.md
│       ├── llm-integration.md
│       ├── seeding.md
│       ├── api.md
│       ├── frontend.md
│       └── future-work.md
├── shared/
│   ├── roles.js           # 25 role vocabulary + skill pools + certs
│   └── cities.js          # ~100 US cities with lat/lng + population weight
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js       # Express bootstrap
│   │   ├── db.js          # Mongoose connect
│   │   ├── llm.js         # OpenAI SDK factory pointed at Groq
│   │   ├── models/
│   │   │   ├── Crew.js
│   │   │   └── SearchLog.js
│   │   └── routes/
│   │       └── search.js  # POST /api/search
│   └── scripts/
│       ├── smoke.js       # verify Mongo + Groq
│       └── seed.js        # generate 10,000 crew records
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

## Dev workflow

All commands are run from the repo root (`F:\web-clients\lemonlight`).

| Command | What it does |
|---|---|
| `npm run install:all` | Installs root + server + client deps |
| `npm run smoke` | Sanity-checks Mongo + Groq connectivity (~5s) |
| `npm run seed` | Wipes and reseeds `crew` collection with 10k records (~20s) |
| `npm run dev` | Runs server (`:3001`) + client (`:5173`) concurrently |
| `npm run server` | Runs server only |
| `npm run client` | Runs client only |

Typical bring-up on a fresh clone:

```
cp .env.example .env       # then fill MONGODB_URI + GROQ_API_KEY
npm run install:all
npm run smoke              # must pass before proceeding
npm run seed
npm run dev
# → open http://localhost:5173
```

## Where the meaningful code lives

- **The endpoint that does everything:** `server/src/routes/search.js`.
  Parse → aggregate → rationale → log. Read this file first.
- **The prompts:** in the same file. Extracted only if we grow past two.
- **The data model:** `server/src/models/Crew.js`,
  `server/src/models/SearchLog.js`.
- **The vocabularies:** `shared/roles.js` (roles + skills + certs),
  `shared/cities.js` (geo). Both `imported` by seed and server.

## Conventions

- **ES modules** everywhere (`"type": "module"` in server package.json,
  `.jsx` files client-side).
- **No dotenv package.** Server scripts use Node's built-in `--env-file=../.env`
  flag. Version pin: Node 20.6+ required.
- **No comments explaining WHAT code does.** Comments only for non-obvious
  WHY (hidden constraints, workarounds, invariants).
- **Fire-and-forget for `SearchLog.create`.** Logging must never block or
  fail a search.
- **Fallbacks over 500s.** LLM errors trigger regex-parser + template
  rationale, not user-visible failures. Mongo errors trigger a real 503.
- **Windows paths in tool calls.** Use full absolute paths with drive
  letter (`F:\web-clients\lemonlight\...`), backslashes OK.

## What's out of scope (per the brief)

- Auth
- Analytics beyond `SearchLog` persistence
- Cost optimization
- Date/time availability
- Any page beyond crew search

Each of these has an approach section in
[`/docs/architecture/future-work.md`](./docs/architecture/future-work.md) —
that's the go-to for the "how would you approach X" interview questions.

## Verification

The end-to-end verification steps live in
[`/docs/architecture/README.md`](./docs/architecture/README.md) and expand
each doc's own testing notes. Quick smoke test:

1. `npm run smoke` returns two green lines.
2. `npm run seed` reports `seeded 10000 crew records`.
3. `npm run dev`, browser to `http://localhost:5173`, run the demo query
   `"Need a licensed electrician in Austin for a kitchen rewire tomorrow"`,
   verify: results in <2s, top match is an electrician near Austin marked
   `Available`, the "Parsed as" panel shows the structured filter.
4. In Atlas: `db.searchlogs.find().sort({createdAt:-1}).limit(1)` — verify
   the query was logged.

## Doc <-> code sync rule

If you change a schema, prompt, endpoint, or the seed distribution, update
the matching file under `/docs/architecture/` **in the same commit**. Docs
drift is the enemy — this repo is small enough that keeping it in sync is
cheap and pays off on the interview call.
