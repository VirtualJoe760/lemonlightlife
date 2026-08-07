# API contracts

Base URL in development: `http://localhost:3001`
All request/response bodies: `application/json`

The API has two search-related endpoints:

- **`POST /api/search`** — brief-required direct search. One sentence in,
  ranked matches out.
- **`POST /api/chat`** — conversational endpoint that powers the mobile
  chat UI. The LLM decides when to invoke the `search_subcontractors` tool;
  tool results are returned to the client for rich rendering.

Both endpoints share the same underlying ranker (`server/src/ranker.js`).

## `GET /api/health`

Liveness probe. No DB or LLM dependency.

**Response 200:** `{ "ok": true }`

## `POST /api/search`

Direct search — the primitive.

### Request

```json
{ "description": "Need a vinyl flooring specialist in Palm Desert this week" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `description` | string | yes | 1–1000 chars. |

### Response 200

```json
{
  "results": [
    {
      "_id": "6712abc...",
      "name": "Marcus Alvarez",
      "gender": "male",
      "headshotUrl": "/headshots/flooring-male-02.png",
      "roles": ["flooring"],
      "specializations": [
        { "skill": "vinyl plank", "level": 5, "yearsInSpecialty": 8 },
        { "skill": "laminate install", "level": 3, "yearsInSpecialty": 4 }
      ],
      "yearsExperience": 12,
      "city": "Palm Desert",
      "county": "Riverside",
      "state": "CA",
      "hourlyRate": 62,
      "rating": 4.7,
      "certifications": ["OSHA 30"],
      "bookingStatus": "available",
      "distanceMi": 3.4,
      "matchScore": 0.91,
      "specializationScore": 1.0,
      "rationale": "Local Palm Desert flooring pro who's a go-to for vinyl plank (8 yrs at expert level) — 3 miles from the job, available now."
    }
  ],
  "parsedFilters": {
    "roles": ["flooring"],
    "requiredSkills": ["vinyl plank", "vinyl flooring"],
    "location": { "city": "Palm Desert", "state": "CA" },
    "radiusMi": 30,
    "urgencyDays": 7,
    "projectType": "residential"
  },
  "latencyMs": 1180
}
```

### Response 400

`{ "error": "description must be a non-empty string" }`

### Response 503

`{ "error": "database unavailable" }`

LLM failures do NOT return 503 — regex parser + template rationale fall
back invisibly.

## `POST /api/chat`

Conversational endpoint. Powers the UI.

### Request

```json
{
  "sessionId": "c3e2f1a4-...",
  "messages": [
    { "role": "user", "content": "I need a licensed electrician in San Diego for a kitchen rewire tomorrow" }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string | Client-generated UUID. Stable across a conversation. Used to key `chatlogs`. |
| `messages[]` | array | Full conversation history. Last message must be `role: "user"`. |

### Response 200

```json
{
  "assistant": {
    "role": "assistant",
    "content": "I found a few strong matches for a same-day kitchen rewire near San Diego. Marcus is your best fit — local, kitchen-rewire expert, and available now."
  },
  "toolCalls": [
    {
      "id": "call_01",
      "name": "search_subcontractors",
      "args": {
        "roles": ["electrician"],
        "requiredSkills": ["kitchen rewire"],
        "location": { "city": "San Diego", "state": "CA" },
        "radiusMi": 30,
        "urgencyDays": 1
      },
      "result": {
        "results": [ /* same shape as /api/search results */ ],
        "parsedFilters": { /* echoed args */ }
      },
      "latencyMs": 240
    }
  ],
  "latencyMs": 1720
}
```

The client:
- Renders `assistant.content` as a chat bubble (markdown allowed).
- Renders each `toolCalls[].result` as a `<SubcontractorResults>` component
  (rich card grid, inline in the conversation).
- Stores `sessionId` and appends the assistant message to its local history
  for the next turn.

**Multi-turn refinements** work naturally — the client sends the growing
`messages[]` on every request, and the LLM either answers directly ("that
one who was in Palm Desert — his name is Marcus") or invokes the tool
again with refined filters.

### Response 400

`{ "error": "messages must be a non-empty array ending with a user message" }`

### Response 503

`{ "error": "database unavailable" }`

## Function-calling schema (`search_subcontractors`)

Exposed to the LLM via Groq's OpenAI-compatible `tools` parameter.

```json
{
  "type": "function",
  "function": {
    "name": "search_subcontractors",
    "description": "Search the subcontractor database for people who match a project need. Use this whenever the user describes work they need done or asks for recommendations. The tool handles ranking by role match, specialization level for the requested skills, geographic proximity, and rating.",
    "parameters": {
      "type": "object",
      "properties": {
        "roles": {
          "type": "array",
          "items": { "type": "string", "enum": ["carpenter","electrician","plumber","roofer","hvac","drywall","painter","tile","mason","concrete","flooring","insulation","siding","foundation","excavator","laborer","supervisor","welder","glazier","landscaper","cabinet","demolition","waterproofing","solar","gutter"] }
        },
        "requiredSkills": { "type": "array", "items": { "type": "string" }, "description": "Specific skills or specializations the job requires, e.g. \"vinyl flooring\", \"kitchen rewire\"." },
        "location": {
          "type": "object",
          "properties": {
            "city":  { "type": "string" },
            "state": { "type": "string" }
          }
        },
        "radiusMi":    { "type": "number", "default": 30 },
        "urgencyDays": { "type": "number", "description": "0=today, 1=tomorrow, 7=this week, 30=anytime" }
      },
      "required": ["roles"]
    }
  }
}
```

## Not implemented (out of scope)

- `POST /api/subcontractors` — add a subcontractor
- `PATCH /api/subcontractors/:id/status` — update booking status
- `GET /api/chatlogs` / `GET /api/searchlogs` — retrieve logged conversations
- `POST /api/matches/:searchId/accept` — record who was actually hired
- Auth endpoints
- Streaming responses on `/api/chat` (would use SSE if added — the response
  shape above is already close to what a final SSE payload would look like)

See [`future-work.md`](./future-work.md).
