# Build plan — finalized

Snapshot of what's shipped and what's left, in execution order. All estimates are working time; total remaining is ~4–5 hours to demo-ready.

## Shipped

- ✅ Monorepo scaffolded (root, `server/`, `client/`, `shared/`)
- ✅ Tailwind CSS 3.4 + shadcn/ui + Framer Motion wired
- ✅ Full architecture docs (`docs/architecture/`)
- ✅ AGENTS.md + CLAUDE.md context files
- ✅ SoCal city vocabulary (~85 cities across LA/OC/RIV/SBD/SD/IMP)
- ✅ 25 construction-role vocabulary + skill pools + certifications
- ✅ Mongoose models: `Subcontractor` (with specializations), `SearchLog`, `ChatLog`
- ✅ Shared ranker (`server/src/ranker.js`) — 30% role / 30% specialization / 25% geo / 15% rating
- ✅ Local Mongo running, smoke test passes
- ✅ Groq connectivity verified (`openai/gpt-oss-120b`)
- ✅ Gemini image generation working (`gemini-3.1-flash-image`)
- ✅ 6 UI mockup references in `docs/architecture/ui-references/mockups/`
- ✅ 5 sample headshots in `client/public/headshots/`
- ✅ **10,000 subcontractors seeded** with realistic specialization distribution
- ✅ 7 clean commits pushed as feature branches (`main` push pending user action)

## Remaining — execution order

### 1. Finish headshot pool (~5 min, background)

Run `npm run generate-headshots` (no `--limit`) to fill the full 40-image pool. Optional but improves visual variety in demos. Can also be deferred until after routes work.

### 2. `POST /api/search` — direct search primitive (~30 min)

`server/src/routes/search.js` — brief-required endpoint. Wires:
1. LLM parse (Groq JSON mode) → structured filters
2. `ranker.rank(filters)` → top 10
3. Batched LLM rationale (single Groq call for all 10)
4. Fire-and-forget `SearchLog.create({...})`
5. Return `{ results, parsedFilters, latencyMs }`

Fallbacks: regex parser on LLM parse failure, template rationale on rationale failure. Never returns 500 on LLM issues.

### 3. `POST /api/chat` — tool-calling conversational endpoint (~45 min)

`server/src/routes/chat.js` — powers the UI. Wires:
1. Groq `chat.completions.create` with `tools: [search_subcontractors_schema]` + full message history
2. If model invokes the tool → parse args → `ranker.rank(args)` → feed result back as `role: "tool"` message → second Groq call for synthesis
3. Fire-and-forget `ChatLog.create({sessionId, messages, toolCalls, latencyMs})`
4. Return `{ assistant, toolCalls, latencyMs }`

### 4. Wire routes into `server/src/index.js` + prove end-to-end (~15 min)

Mount both routes. Curl each endpoint with a sample query. Verify `SearchLog` + `ChatLog` documents land. Confirm p95 < 2s.

### 5. Full-pool headshot generation if not done in step 1 (~5 min)

### 6. Build SPA (~2 hrs)

Adapting the three Tailwind UI paste-ins in `docs/architecture/ui-references/`:
- **Shell** (`Shell.jsx` + `Sidebar.jsx`): from `01-sidebar-layout.jsx`. Strip Tailwind v4-only classes. Replace nav items with our 5 (Home / Chat / Team / Projects / Account). Static "General Contractor" account in the profile spot.
- **Home page** (`pages/Home.jsx`): from `02-hero.jsx`. Drop the internal header/nav (sidebar handles it). "Get Started" routes to `/chat`.
- **Chat page** (`pages/Chat.jsx`): fullscreen chat, sticky input at bottom, `<SubcontractorResults>` renders tool-call results as a grid of `<SubcontractorCard>`s adapted from `03-team-section.jsx`. Framer Motion stagger on card reveal.
- **Team page** (`pages/Team.jsx`): full roster browse, same `<SubcontractorCard>` reused.
- **Projects / Account:** placeholder pages with static content.

Server-rendered shell = Express serves `index.html` for all non-`/api/*` routes.

### 7. Polish + demo dry-run (~30 min)

- Error/empty states on Chat (no results, LLM error, network fail)
- Test three demo queries end-to-end:
  1. `"Need a licensed electrician in Palm Desert for a kitchen rewire tomorrow"`
  2. `"Looking for a vinyl flooring specialist in Long Beach this week"`
  3. `"Stone mason for a chimney restoration in Escondido"`
- Verify latency p95 < 2s on all three
- Verify `SearchLog` + `ChatLog` documents in Mongo after each

## Interview prep

- Full "how would you approach X" answers already in `docs/architecture/future-work.md` (auth, analytics, cost optimization, date/time availability, vector search, provider redundancy)
- Deviations from brief documented in `AGENTS.md` under "User-directed deviations" — defensible: SoCal for realistic density, extra pages for demo strength, `/api/chat` layered on top of brief-required `/api/search` (both live)

## Demo verification checklist (run before the call)

- [ ] `npm run smoke` → both green
- [ ] `npm run seed` → 10,000 seeded in <30s
- [ ] `npm run generate-headshots` → 40 images (or more) in `client/public/headshots/`
- [ ] `npm run dev` → server on `:3001`, client on `:5173`
- [ ] Home → click Get Started → Chat page loads
- [ ] Type demo query → results in <2s → 10 SubcontractorCards render inline
- [ ] Expand "Parsed as" → shows structured filters
- [ ] Sidebar navigation between Home / Chat / Team / Projects / Account works
- [ ] `db.searchlogs.find().sort({createdAt:-1}).limit(1)` returns the last query
- [ ] `db.chatlogs.find().sort({createdAt:-1}).limit(1)` returns the last chat turn with `toolCalls`
