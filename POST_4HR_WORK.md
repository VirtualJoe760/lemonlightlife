# Post-4-hour work log

The brief called for a 4-hour build. This document is an honest ledger of
everything shipped **after** that 4-hour mark. Kept separate from the main
architecture docs so reviewers can see exactly what's in scope of the
original time budget and what isn't.

## Timeline

- **Hours 0–4 (in scope):** everything landed up to and including the
  first commit that mounted `/api/search` + `/api/chat` and rendered the
  Chat page with tool-driven results. That's roughly commits through
  `feat(client): SPA — Router + Shell + Sidebar + 5 pages + rich cards`.
- **Hours 4+ (this document):** everything below.

## What was done after 4 hours (and why)

### UI / product polish (user-directed)

- Rebrand to **Kristel Match** (Palm Springs mid-century) — new hero
  photo background, name change, favicon + logo generation via Gemini,
  static "Joseph Sardella" account.
- Dark palette by default, warm charcoal / cream / orange, Jost font
  with lighter weights.
- Translucent + collapsible sidebar (localStorage persistence).
- Mobile bottom-nav (replacing the hamburger drawer) with iOS
  safe-area padding.
- PWA files (`manifest.webmanifest`, minimal service worker,
  `apple-touch-icon`, theme-color) — app is installable from
  "Add to Home Screen."
- Team page rebuilt Zillow-style: sticky search + filter bar, live
  result count, "Recommended for you" section above the roster.
- Inline SVG butterfly-roof logo (square, transparent, currentColor)
  replacing the raster Gemini output that kept baking in a background.
- Project-merge refactor: `/chat` route deleted; **projects are the
  single entry point**. Wizard workspace at `/projects/:id` runs a
  guided step flow (Name → When → What → Crew → Send) with Framer
  Motion transitions. Simulated invitation modal on completion.

### Backend beyond the brief

- `Project` Mongo collection with `brief` (where/when/what/budget/
  startDateTime/complete), `crewRoster [{role, count, reason, filled[]}]`,
  `invitations {sentAt, crew[{subcontractorId, role, invitedAt,
  calendarEventId}]}`, `status` enum, `selectionProgress` virtual.
- Eight `/api/projects` endpoints (CRUD + `/select`, `/deselect`,
  `/invite`).
- `/api/chat` extended with `projectId` param + two additional tools
  (`update_project_brief`, `propose_crew_roster`) so the LLM can
  patch the project state in-process during the wizard.
- Simulated invitation: `POST /api/projects/:id/invite` fabricates
  calendar event IDs and flips project status to `invited` — no real
  email/calendar integration (per the brief; noted in
  `future-work.md`).
- Local-filesystem LLM logging (`server/src/localLog.js` +
  `local-logs/`) — writes full round-trip JSON per API request for
  prompt tuning.

### Deployment work

- Domain `kristelmatch.site` on Vercel.
- Migrated MongoDB from local dev to **MongoDB Atlas** (M0 free tier)
  so the production deploy can hit the DB.
- **Vercel Function refactor** (this session): moved from static-only
  deploy to a proper full-stack deploy by exposing the Express app as
  a serverless catch-all Function (`api/[...path].js`) that imports
  the built `server/src/app.js`. Runtime deps (express/cors/mongoose/
  openai) promoted from `server/package.json` to root `package.json`
  so Vercel bundles them with the Function.
- Env vars added in Vercel dashboard: `MONGODB_URI`, `GROQ_API_KEY`,
  `GEMINI_API_KEY`.

### Bug fixes on live

- **Delete + nested-URL 404:** the initial Vercel Function catch-all
  used `api/[[...path]].js` (optional catch-all). It matched
  `/api/projects` (create/list) but 404'd on `/api/projects/:id` —
  breaking both `GET /:id` and `DELETE /:id`. Fixed by renaming to
  the standard non-optional catch-all `api/[...path].js`, which
  reliably matches nested segments.

## Post-4hr honest summary

Total after-hours work: several sittings of ~15–45 min each spread
across a few sessions. Roughly a full second work-day of iteration
on top of the original build.

The core matchmaking primitive (parse a sentence → rank 10k crew →
return with rationale) — the brief's actual ask — was working inside
the 4-hour window. Everything past that added product polish,
architectural depth (project state machine, tool-calling wizard),
deployability, and PWA/mobile fit. Not required by the brief, but the
result is a much more compelling demo.
