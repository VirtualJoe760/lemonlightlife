# LLM integration

## Provider: Groq

- **Base URL:** `https://api.groq.com/openai/v1`
- **Auth:** `Authorization: Bearer $GROQ_API_KEY`
- **Model:** `openai/gpt-oss-120b` (configurable via `GROQ_MODEL`)
- **SDK:** `openai` npm package pointed at Groq's OpenAI-compatible endpoint

### Why Groq

- **Throughput.** Groq's LPU inference on gpt-oss-120b is sub-second for our
  prompt sizes. We're doing two LLM hops per search (parse + rationale) and
  still need to stay under a 2s p95 — this doesn't work on most other hosted
  providers without heroic engineering.
- **OpenAI-compatible.** Zero SDK lock-in. If we need to swap models, we
  change one env var. If we need to swap providers entirely, we change one
  more.
- **gpt-oss-120b is a strong open model.** JSON mode is well-supported. It
  handles the parsing task with a short prompt and no fine-tuning.

### Client setup

Single factory in `server/src/llm.js`:

```js
import OpenAI from "openai";

let client;
export function getLLM() {
  if (client) return client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  const baseURL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  client = new OpenAI({ apiKey, baseURL });
  return client;
}

export const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
```

Cached at module scope so we don't re-instantiate per request.

## Prompts

Both prompts live in `server/src/routes/search.js` so the search flow is
readable end-to-end in a single file. If a third LLM use appears, extract
them to `server/src/prompts/`.

### Parser prompt

**Role: system**

```
You extract structured filters from a natural-language construction project
description written by a general contractor.

Return valid JSON matching this schema exactly:

{
  "roles": string[],           // pick 0+ keys from the ROLES vocabulary below. lowercase, exact match.
  "requiredSkills": string[],  // short skill phrases mentioned or implied (e.g. "kitchen rewire", "shingle replacement")
  "location": { "city": string, "state": string } | null,
  "radiusMi": number,          // reasonable default 50; smaller for urgent same-day requests
  "urgencyDays": number,       // 0 = today, 1 = tomorrow, 7 = this week, 30 = anytime
  "projectType": string        // "residential" | "commercial" | "mixed"
}

ROLES vocabulary: [carpenter, electrician, plumber, roofer, hvac, drywall,
painter, tile, mason, concrete, flooring, insulation, siding, foundation,
excavator, laborer, supervisor, welder, glazier, landscaper, cabinet,
demolition, waterproofing, solar, gutter]

Rules:
- Return ONLY the JSON. No prose, no markdown fences.
- If a role isn't explicitly named but is implied by the task (e.g.
  "rewire" → electrician, "reshingle" → roofer), include the implied role.
- If location is ambiguous or missing, set to null.
- If urgency is unclear, default urgencyDays to 7.
```

**Role: user**

```
{description}
```

**Call config:**

```js
llm.chat.completions.create({
  model: MODEL,
  messages: [{ role: "system", content: PARSER_SYSTEM }, { role: "user", content: description }],
  response_format: { type: "json_object" },
  max_tokens: 300,
  temperature: 0.1,
});
```

Low temperature — this is extraction, not generation.

### Rationale prompt

**Role: system**

```
You explain why each of these crew members is a strong fit for the
contractor's request. One sentence per crew, referencing concrete details
(role, location relative to job, standout skill, experience). Return valid
JSON: { "rationales": string[] } — same order as the input crew list.

Be specific and honest. If a crew member is a weaker fit than the others,
lead with what they DO bring (e.g. availability, distance) rather than
overselling role alignment.
```

**Role: user**

```
Request: "{description}"
Parsed as: {parsedFilters as JSON}

Crew (in ranked order):
[
  { "name": "...", "roles": [...], "skills": [...], "city": "...", "state": "...",
    "yearsExperience": ..., "distanceMi": ..., "certifications": [...] },
  ...
]
```

**Call config:**

```js
llm.chat.completions.create({
  model: MODEL,
  messages: [{ role: "system", content: RATIONALE_SYSTEM }, { role: "user", content: userPayload }],
  response_format: { type: "json_object" },
  max_tokens: 800,
  temperature: 0.4,
});
```

Slightly higher temperature — a bit of variety in phrasing is good UX.
Bounded at 800 tokens so a runaway response can't blow the latency budget.

## Fallbacks

Both LLM calls are wrapped in try/catch. Any failure trips the fallback path:

- **Parser fallback:** regex the description against role aliases from
  `shared/roles.js`. Extract location by looking for `"in <TitleCase>"`
  patterns and cross-referencing `shared/cities.js`. Set `_fallback: true`
  on the parsed filter object so the client "Parsed as" panel can indicate
  we're in degraded mode.

- **Rationale fallback:** for each crew, emit a template string:

  ```
  ${primaryRole}, ${yearsExperience} yrs, ${city} ${state} — ${bookingStatus}.
  ```

The search endpoint therefore never hard-fails on LLM issues. Worst case
the contractor still gets 10 candidates with terse rationales.

## Cost & rate limits

Not addressed at MVP (out of scope per brief), but see
[`future-work.md`](./future-work.md) for the plan: SHA-256 cache on
`description → parsedFilters`, drop rationale LLM at high scale in favor
of templates, and switch to a smaller model for the parse step if latency
allows.
