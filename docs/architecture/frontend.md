# Frontend

Mobile-first SPA modeled on major LLM chat products (Claude / ChatGPT), with
a server-rendered shell that hosts the persistent sidebar and initial route.
Styled with Tailwind CSS + shadcn/ui. Framer Motion for interaction polish
on LLM-rendered components. Tailwind UI paste-in components used where the
user provides them.

## User flow

```
   ┌─────────────────────────────────────────────────────────────────┐
   │  HOMEPAGE  ─  Hero + "Get started" CTA                          │
   │                    │                                            │
   │                    ▼                                            │
   │  CHAT  ─────  descriptive project prompt (textarea)             │
   │                    │                                            │
   │                    ▼   LLM tool call: search_subcontractors     │
   │  TEAM SELECTION ── ranked SubcontractorCard grid inline in chat │
   │                    │                                            │
   │                    ▼   User taps a card                         │
   │  SUBCONTRACTOR DETAIL ── testimonial-style profile + Select     │
   │                    │                                            │
   │                    ▼                                            │
   │  PROJECT  ─────  saved to sidebar; contractor can build the     │
   │                  full crew by continuing to chat                │
   └─────────────────────────────────────────────────────────────────┘
```

## Layout

Persistent left sidebar + main content pane. On mobile, sidebar collapses
into a drawer accessible via a hamburger button in the top bar.

### Sidebar

Fixed vertical nav on the left. Each item is a route.

| Item | Route | Purpose |
|---|---|---|
| Home | `/` | Landing hero. Also shows recent projects for returning users. |
| Chat | `/chat` | Main chat interface. New conversation. |
| Team | `/team` | Read-only browse of the full subcontractor roster (filtered/searchable). |
| Projects | `/projects` | List of saved projects (chat sessions grouped into a "project" context). |
| Account | `/account` | Single "general contractor" account — static, no auth. |

Sidebar footer: account avatar + name (static: "General Contractor").

### Top bar (on the main pane)

- On mobile: hamburger (opens sidebar drawer) + page title
- On desktop: page title + optional page-specific actions ("New chat", etc.)

## SPA + server-rendered shell

- **Server-rendered shell:** Express serves an initial HTML that includes
  the sidebar + basic layout skeleton. This gives us a fast first paint,
  keeps the sidebar consistent across route changes, and avoids a full
  React re-render just to display the nav.
- **SPA hydration:** React takes over inside the main content pane.
  Client-side routing handles Home / Chat / Team / Projects / Account
  without full page reloads.
- No auth. The "general contractor" account is a static object served in
  the initial HTML payload.

Practical implementation: Express serves `index.html` for all non-`/api/*`
routes; React Router (or a minimal file-based router) handles the client
navigation inside. The "SSR" here is the shell + initial state, not
per-page React rendering — full SSR is out of scope for a 4-hour trial.

## Pages

### `/` — Home (Hero)

- Full-viewport hero with tagline and "Get started" CTA
- Below the fold: 2–3 explainer sections describing what the tool does
- CTA scrolls or routes to `/chat`
- If projects exist, a "Recent projects" section links back into them

### `/chat` — Chat interface

- Fullscreen chat column, sticky input at bottom
- Message list scrolls above input
- Assistant text messages render as chat bubbles
- Tool-result messages render as `<SubcontractorResults>` — a grid of
  `<SubcontractorCard>` components inline in the conversation
- Framer Motion on `<SubcontractorResults>` reveal (stagger children on
  first render)

### `/team` — Team browse

- Full roster of subcontractors, filterable by role / county / availability
- Same `<SubcontractorCard>` component reused from chat
- Uses a Tailwind UI team-section component (user will paste) as the base
  layout

### `/projects` — Projects list

- Each project = a saved chat session with selected subcontractors
- Card per project: name, project prompt excerpt, count of selected crew,
  last activity
- Click → resumes that chat session

### `/account` — Account

- Static contractor profile: name, company, contact info
- No editing UI for MVP
- Placeholder for future auth / preferences

## Component tree (rough)

```
<App>
  <Shell>                               // server-rendered outer HTML
    <Sidebar>                           // Home / Chat / Team / Projects / Account
    <MainPane>
      <Routes>
        <Home />
        <Chat>
          <ChatShell>
            <MessageList>
              <UserBubble />
              <AssistantBubble />
              <ToolResultBubble>
                <SubcontractorResults>          // Framer Motion stagger
                  <SubcontractorCard />
                </SubcontractorResults>
              </ToolResultBubble>
            </MessageList>
            <InputBar />
          </ChatShell>
        </Chat>
        <Team>
          <TeamGrid>                     // reuses SubcontractorCard
        </Team>
        <Projects />
        <Account />
      </Routes>
    </MainPane>
  </Shell>
</App>
```

## File layout

```
client/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── components.json
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx                    // <Shell> + <Routes>
    ├── index.css
    ├── lib/utils.js               // cn()
    ├── components/
    │   ├── ui/                    // shadcn primitives
    │   ├── Shell.jsx              // sidebar + main-pane layout
    │   ├── Sidebar.jsx
    │   ├── ChatShell.jsx
    │   ├── Message.jsx
    │   ├── SubcontractorResults.jsx  // Framer Motion stagger
    │   ├── SubcontractorCard.jsx
    │   └── ParsedFiltersPanel.jsx
    ├── pages/
    │   ├── Home.jsx
    │   ├── Chat.jsx
    │   ├── Team.jsx
    │   ├── Projects.jsx
    │   └── Account.jsx
    └── hooks/
        └── useChat.js
```

## Component references

The user will paste Tailwind UI components (hero, team section, testimonial,
etc.) that we adapt into the components above. Rule of thumb: keep the
paste-in structure and class strings as-is, swap in our data + our
`<SubcontractorCard>` where appropriate. Don't over-restyle — the whole
point of using Tailwind UI as a base is to move fast on layout that
already looks polished.

## Animation (Framer Motion)

Restrained. Where we use motion:

- `SubcontractorResults` — stagger reveal of cards on tool-result arrival
- Route transitions — fade + slight y-offset when switching between
  sidebar destinations
- Sidebar drawer on mobile — slide-in/out
- `Select` button on `<SubcontractorCard>` — subtle scale-tap feedback

That's it. No parallax, no scroll-linked animations, no "vibes." The value
is that when new content arrives from the LLM, the eye follows it smoothly.

## Styling

- Tailwind CSS + shadcn/ui component library.
- CSS variables in `index.css` define palette (light + dark modes).
- Primary accent: construction orange (`hsl(24 95% 43%)`).
- No dark-mode toggle for MVP but variables are defined.

## Mobile-first sizing

- Base viewport 375px. Sidebar collapses to drawer.
- `md:` (768px) — sidebar becomes persistent, chat column has comfortable
  width cap.
- `lg:` (1024px) — main pane caps at 900px, centered.
- `min-h-dvh` on the shell so the input stays glued to the bottom on iOS.
- No hover-only states — all actionable elements work with taps.

## Data / state

- **`useChat`** — POST `/api/chat`, manages `messages[]`, `sessionId`,
  loading, error. One hook per active conversation.
- **Global lightweight store** for the selected project + selected crew
  (React Context; no Redux). This state is what powers the sidebar
  "Projects" list and the persistent selection across route changes.
- **No client-side data fetching for team browse yet** — we'll call
  `/api/subcontractors?filter=...` if we build the Team page fully, or
  reuse the chat endpoint with a canned prompt for MVP.

## What's NOT here

- Auth (out of scope — brief). Account page is static.
- Real-time updates (no websockets, no polling).
- Full SSR per-page (only the shell + initial state).
- Optimistic UI on chat send (the typing indicator is enough for MVP).
