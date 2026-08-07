# Project-merge + wizard + invitation plan

**Status:** temp planning doc. Delete after implementation lands.

## Vision (from user, combined)

> Combine project + chat into one flow. Get Started routes to
> project creation. Instead of a static form, use a **chat-driven wizard
> with guided questions** to capture project details. After the brief is
> gathered, the assistant proposes a **crew roster** (how many, per role).
> The contractor selects a crew member for each role slot. When every
> slot is filled, pop a **success modal** simulating an invitation flow
> — "everyone invited, calendars updated."

Read as: **the app is a project-completion wizard, not a search box.**

## End-to-end user flow

```
/ (Home hero + Get Started)
   │
   ▼
/projects (list existing + "Start new project")
   │
   ├─▶ [Start new project]
   │        │
   │        ▼
   │   /projects/:id (workspace — guided wizard)
   │        │
   │        ├──── Phase 1: BRIEF (chat wizard) ─────────────────┐
   │        │     Assistant: "What kind of project?"            │
   │        │     User: "Kitchen remodel in Palm Desert"        │
   │        │     Assistant: "Great — when do you need to       │
   │        │       start? …"  (guided Qs until brief complete) │
   │        │                                                    │
   │        ├──── Phase 2: ROSTER (assistant proposal) ─────────┤
   │        │     Assistant: "Based on that, you'll need:       │
   │        │       1 electrician, 1 plumber, 1 tile setter,    │
   │        │       1 painter. Here are candidates for each."   │
   │        │     (Renders SubcontractorResults per role slot)  │
   │        │                                                    │
   │        ├──── Phase 3: SELECTION ───────────────────────────┤
   │        │     Contractor taps "Select" on one card per      │
   │        │     role. Progress bar: "2 of 4 crew selected."   │
   │        │     Sidebar rail shows selected crew persistently. │
   │        │     User may chat to swap ("actually find me      │
   │        │     a different tile setter") — assistant does    │
   │        │     a fresh search_subcontractors call.           │
   │        │                                                    │
   │        └──── Phase 4: INVITE ──────────────────────────────┘
   │              When all slots filled, "Send invitations"
   │              button appears. Click → modal:
   │              "✓ 4 crew invited. Calendars updated."
   │              Project.status flips to "invited".
   │
   └─▶ [Resume existing project] → same workspace, jumps to whichever phase it's in
```

## Route map

| Now | Proposed | Notes |
|---|---|---|
| `/` | `/` | Get Started CTA → `/projects` |
| `/chat` | *(302 to `/projects`)* | Deleted; workspace is the chat |
| `/team` | `/team` | Unchanged — roster browse |
| `/projects` | `/projects` | Real list, not placeholder |
| — | `/projects/:id` | Wizard workspace (all four phases) |
| `/account` | `/account` | Unchanged |

**Not adding `/projects/new`** — creating a project happens with one
click from `/projects`; the wizard starts immediately with the
assistant's opening question.

## Data model — `projects` collection

```js
{
  _id: ObjectId,
  name: string,                             // auto-suggested from first Q; user-editable
  brief: {
    where:    { city: string, state: "CA" } | null,
    when:     "today" | "tomorrow" | "this-week" | "this-month" | "flexible" | null,
    what:     string | null,                // free-text project description
    budget:   string | null,                // "under-1k" | "1-5k" | "5-25k" | "25k+" | null
    complete: boolean,                      // set true once assistant proposes roster
  },
  crewRoster: [
    {
      role:    string,                      // canonical role key
      count:   number,                      // usually 1, but "2 electricians" possible
      reason:  string,                      // LLM's short explanation
      filled:  [ObjectId],                  // subcontractor _ids the contractor picked
    }
  ],
  chatSessionId: string,                    // links to ChatLog docs
  status: "brief" | "selecting" | "invited" | "archived",
  invitations: {
    sentAt: Date | null,
    crew: [
      {
        subcontractorId: ObjectId,
        role: string,                       // which slot they filled
        invitedAt: Date,
        calendarEventId: string,            // simulated — a UUID
      }
    ],
  },
  createdAt: Date,
  updatedAt: Date,
}
```

Status transitions:
- `brief` → `selecting` when `brief.complete = true` AND `crewRoster.length > 0`
- `selecting` → `invited` when every roster slot has `filled.length >= count`
- Any → `archived` on soft-delete

Selection completeness helper (server-side computed field):
`selectionProgress = { filled: sum(filled.length), total: sum(count) }`.

## LLM strategy — three tools for the wizard

The chat endpoint gets three function-callable tools instead of just one.
The assistant picks whichever is right for the current phase.

### 1. `update_project_brief(patch)`

Called during Phase 1. Assistant patches individual brief fields as it
learns them from the conversation.

```json
{
  "type": "function",
  "function": {
    "name": "update_project_brief",
    "description": "Update the current project's brief with details the contractor just shared. Call this every time you learn something concrete (a role, location, timing, or budget). Do NOT set fields you haven't heard yet.",
    "parameters": {
      "type": "object",
      "properties": {
        "name":   { "type": "string" },
        "where":  { "type": "object", "properties": { "city": {"type":"string"}, "state": {"type":"string"} } },
        "when":   { "type": "string", "enum": ["today","tomorrow","this-week","this-month","flexible"] },
        "what":   { "type": "string", "description": "Short description of what needs to be built/fixed" },
        "budget": { "type": "string", "enum": ["under-1k","1-5k","5-25k","25k+"] }
      }
    }
  }
}
```

### 2. `propose_crew_roster(roles)`

Called at end of Phase 1, once assistant has enough to compose a crew.
Sets `brief.complete = true` and populates `crewRoster`.

```json
{
  "type": "function",
  "function": {
    "name": "propose_crew_roster",
    "description": "Once you have enough project detail (at minimum the 'what' and ideally location), propose the crew composition. Return one entry per trade needed — count is usually 1, use 2+ only when the scope clearly needs a bigger crew of that role.",
    "parameters": {
      "type": "object",
      "properties": {
        "roles": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "role":   { "type": "string", "enum": ["carpenter","electrician","plumber", "..."] },
              "count":  { "type": "number", "minimum": 1, "maximum": 5 },
              "reason": { "type": "string", "description": "One short sentence on why this role is needed for this specific project" }
            },
            "required": ["role","count","reason"]
          }
        }
      },
      "required": ["roles"]
    }
  }
}
```

### 3. `search_subcontractors(...)` — unchanged from current

Called during Phase 2 or Phase 3 to fill (or refill) a slot. Same schema
as today. When the assistant is doing initial Phase 2 population, it
calls this once per role from the freshly proposed roster.

## API changes

### New endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/projects` | GET | List projects (sorted by updatedAt desc) |
| `/api/projects` | POST | Create empty project → returns `{ _id, chatSessionId }` |
| `/api/projects/:id` | GET | Fetch single project (brief + roster + selected crew populated) |
| `/api/projects/:id` | PATCH | Update brief / crewRoster / status / selectedCrew |
| `/api/projects/:id/select` | POST | body: `{ role, subcontractorId }` — adds to the right slot's `filled[]`, dedupes |
| `/api/projects/:id/deselect` | POST | body: `{ role, subcontractorId }` — removes from `filled[]` |
| `/api/projects/:id/invite` | POST | Simulates invitation. Sets `status="invited"`, populates `invitations` with fake calendarEventIds, returns the invitation summary |
| `/api/projects/:id` | DELETE | Soft-delete → `status="archived"` |

### `/api/chat` — extended

Client passes a new field `projectId`. Server fetches the project state,
injects it into the system prompt, and exposes the three tools. When the
assistant calls `update_project_brief` or `propose_crew_roster`, the
server applies the patch to the project inline (fire-and-forget PATCH
equivalent, in-process) before continuing to the synthesis call.

Response shape gains `projectUpdated: boolean` so the client knows to
refetch project state.

## Client changes

### Files to add

- `client/src/pages/ProjectsList.jsx` — real list (replaces placeholder)
- `client/src/pages/ProjectWorkspace.jsx` — the entire wizard experience
- `client/src/components/ProjectBriefPanel.jsx` — collapsible header showing gathered brief so far
- `client/src/components/CrewRosterRail.jsx` — persistent right rail: role slots with filled/empty state + progress bar
- `client/src/components/InvitationModal.jsx` — the success modal (Framer Motion pop + confetti-lite)
- `client/src/components/SelectableSubcontractorCard.jsx` — extends `SubcontractorCard` with a `Select` / `Selected` button that persists to the project
- `client/src/hooks/useProject.js` — fetch/update/select for a single project
- `client/src/hooks/useProjectsList.js` — list + create

### Files to remove

- `client/src/pages/Chat.jsx` — subsumed
- `client/src/pages/Projects.jsx` — replaced by ProjectsList

### Files to touch lightly

- `client/src/App.jsx` — routes: add `/projects/:id`; 302 `/chat` → `/projects`
- `client/src/pages/Home.jsx` — Get Started → `/projects`
- `client/src/components/Sidebar.jsx` — "Chat" nav item removed; "Projects" stays
- `client/src/hooks/useChat.js` — accepts `projectId` prop; refetches project on `projectUpdated=true`

### Reused as-is

- `SubcontractorCard`, `SubcontractorResults`, `ParsedFiltersPanel`

## Server changes

- `server/src/models/Project.js` — new Mongoose model per schema above
- `server/src/routes/projects.js` — 8 endpoints from the API table above
- `server/src/routes/chat.js` — extend with the three tools + project state
  injection (behind `projectId` in request body). Backwards-compatible: if
  no `projectId`, behaves like today (only `search_subcontractors` tool).
- `server/src/index.js` — mount projects router
- `Project` gets an index on `{ updatedAt: -1 }` and `{ status: 1 }`

## Invitation flow (simulated)

`POST /api/projects/:id/invite` does the following, entirely in-process:

1. Validate: `selectionProgress.filled == selectionProgress.total`
   (every slot has enough people). If not, 400 with message.
2. For each entry in `crewRoster[*].filled`, create an invitation record:
   ```
   { subcontractorId, role, invitedAt: now, calendarEventId: crypto.randomUUID() }
   ```
3. Set `project.status = "invited"`, `project.invitations.sentAt = now`.
4. Save and return the invitation summary + populated crew names for the
   modal to render.

**No email, no webhook, no external calendar API.** The demo talking point:
"in production this would fan out to the crew's phone via Twilio SMS plus
create a Google Calendar event via OAuth — the schema is set up for that
(see `calendarEventId` field)".

Client-side, `InvitationModal.jsx`:
- Framer Motion scale + fade entry
- Big check icon
- "N crew invited to [project name]"
- List of names + roles
- Small tagline: "Calendars have been updated"
- "Back to projects" button → routes to `/projects`

## Sidebar (post-merge)

```
┌──────────────────────┐
│ ▲ Kristel Match      │
├──────────────────────┤
│ 🏠 Home              │
│ 📁 Projects          │   (Chat item removed)
│ 👥 Team              │
│ 👤 Account           │
├──────────────────────┤
│ JS Joseph Sardella   │
│    General Contractor│
└──────────────────────┘
```

## Docs to update (in the same commits as the code)

### `docs/architecture/`

- **`data-model.md`** — add `projects` schema (brief, crewRoster, invitations,
  status enum). Note the loose `chatSessionId` join to `ChatLog`, the
  `crewRoster[].filled → subcontractors._id` reference, and the status
  transitions.
- **`api.md`** — add all eight `/api/projects*` endpoints with request/response
  shapes. Note that `/api/chat` gains a `projectId` field and exposes three
  tools instead of one when a project is in play.
- **`frontend.md`** — significant rewrite: new user flow diagram with the four
  phases (brief → roster → selection → invited), file layout section updated
  (three pages removed, one added, four new components), state section
  updated (project state via `useProject`, workspace holds phase logic).
- **`overview.md`** — component diagram adds `projects` collection; request
  lifecycle mentions the guided wizard.
- **`search-flow.md`** — add a "guided wizard flow" subsection showing how
  the three tools chain during Phase 1 → Phase 2 → Phase 3.
- **`llm-integration.md`** — add the two new tool schemas
  (`update_project_brief`, `propose_crew_roster`) and note the "project
  state in system prompt" pattern.
- **`build-plan.md`** — remove old "SPA" line; add "project workspace +
  invitation wizard" as its own execution block. Move to "Shipped" once done.
- **`future-work.md`** — add three follow-ups:
  1. Real calendar integration (Google Calendar OAuth + Twilio SMS)
  2. Project ownership + shareable invite links (needs auth)
  3. Roster templates ("Standard kitchen remodel" preset — 5 known roles)
- **`README.md`** — no change unless we add new doc files.
- **`ui-references/`** — no change.

### Repo root

- **`AGENTS.md`** — "User-directed deviations" gets a new bullet: chat is
  now a project workspace wizard, and there's a simulated invitation flow
  standing in for calendar/SMS integration. "Where things live" gets the
  new pages/components/hooks.
- **`CLAUDE.md`** — no change.
- **`project-merge.md`** — **delete** in the final commit.

## Migration steps (in execution order)

1. **Server: `Project` model + all eight routes** (~40 min)
   - Model with brief/roster/invitations/status
   - Eight route handlers with defensive validation
   - Mount, curl-test each

2. **Server: `/api/chat` extension** (~30 min)
   - Accept `projectId` in body
   - Inject project state into system prompt when present
   - Register the three tools (guarded on projectId)
   - In-process apply of `update_project_brief` and `propose_crew_roster`
     tool results to the DB
   - Return `projectUpdated: true` in that case

3. **Client: `ProjectsList` page** (~20 min)
   - Fetch list; render project cards (name, brief.what excerpt, status
     chip, crew progress)
   - "Start new project" button — POST /api/projects → redirect to
     `/projects/:id`
   - Empty state on first load

4. **Client: `ProjectWorkspace` page skeleton** (~30 min)
   - Layout: `<ProjectBriefPanel>` header + chat body + `<CrewRosterRail>`
   - `useProject` hook fetches and holds project state
   - `useChat` extended with `projectId`; passes it on every send

5. **Client: wizard chat behavior** (~30 min)
   - On workspace mount for a brand-new project: auto-send a
     zero-message trigger so the assistant's first turn is the opening
     question ("What kind of project?"). Simplest: send `{ role: "system",
     content: "start" }` internally, hidden from UI.
   - Render `update_project_brief` tool results silently (they're a
     side-effect; the assistant's text is the visible turn)
   - Render `propose_crew_roster` tool results as a
     `<CrewRosterProposal>` inline card ("Here's who you'll need")
   - Render `search_subcontractors` tool results as
     `<SubcontractorResults>` grid (same as today) — cards use
     `<SelectableSubcontractorCard>`

6. **Client: `CrewRosterRail` + selection persistence** (~30 min)
   - Right rail: one section per `crewRoster` entry with slots
   - Each filled slot shows the crew's headshot + name + "Remove"
   - Empty slots show "1 needed" placeholder
   - Progress bar: `filled/total`
   - Tapping "Select" on a card in the chat: POST `/api/projects/:id/select`
     → refetch project → rail updates
   - Tapping "Remove" in the rail: POST `/api/projects/:id/deselect`

7. **Client: `InvitationModal`** (~20 min)
   - When `selectionProgress.filled === selectionProgress.total` AND
     `status === "selecting"`: show a floating "Send invitations" CTA at
     the bottom of the workspace
   - Click → POST `/api/projects/:id/invite`
   - On success → open modal (Framer Motion scale+fade), show summary,
     "Back to projects" navigates

8. **Wire + delete + Home CTA** (~15 min)
   - `App.jsx` routes: add `/projects/:id`; 302 `/chat` → `/projects`
   - `Home.jsx` CTA → `/projects`
   - Sidebar: remove Chat item
   - Delete `client/src/pages/Chat.jsx` and old `Projects.jsx`

9. **Docs update** (~25 min)
   Apply everything under "Docs to update" above, batched into the code
   commits that create the corresponding pieces.

10. **Demo dry-run + commit + push + delete project-merge.md** (~15 min)
    Walk through: home → projects list → start new → chat wizard through
    a kitchen remodel → assistant proposes 4 roles → select one per role →
    invitation modal → back to list showing "invited" chip.

**Total: ~4 hours.**

## Assumed defaults (from your earlier "5 decisions")

Answering my own open questions since you signaled to execute:

1. **Persistence** → Mongo `Project` collection. ✓
2. **Brief fields** → the six from the earlier draft, gathered via chat
   rather than a form. ✓
3. **Kill `/chat` route** → yes, 302 to `/projects`. ✓
4. **Auto-first message** → replaced by wizard: assistant asks first,
   no user typing needed to see the opening prompt.
5. **Sidebar "Recent projects"** → skipped for MVP.

If any of these are wrong, tell me and I'll adjust mid-flight.

## Execution proceeds now
