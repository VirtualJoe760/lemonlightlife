# Search flow — end-to-end

The ranker is one function (`server/src/ranker.js`) called by both
`/api/search` (direct) and the `search_subcontractors` tool inside
`/api/chat`.

## Two entry points, one ranker

```
        ┌──────────────────────┐
        │  POST /api/search    │
        │  { description }     │
        └──────────┬───────────┘
                   │  LLM parses sentence → filters
                   ▼
        ┌──────────────────────┐         ┌──────────────────────┐
        │  ranker(filters)     │ ◀────── │  POST /api/chat      │
        │  → ranked results    │         │  LLM function call:  │
        └──────────┬───────────┘         │  search_subcontractors│
                   │                     └──────────────────────┘
                   ▼
        ┌──────────────────────┐
        │  Mongo aggregation:  │
        │  $search + $geoNear  │
        │  + $addFields (score)│
        │  + $sort + $limit    │
        └──────────────────────┘
```

## The ranker's Mongo aggregation

Input filters:
```
{
  roles:          [string],
  requiredSkills: [string],
  location:       { city, state } | null,
  radiusMi:       number,
  urgencyDays:    number
}
```

Aggregation pipeline (annotated):

```js
[
  {
    $search: {
      index: "subcontractor_default",
      compound: {
        should: [
          { text: { query: filters.roles,          path: "roles",                     score: { boost: { value: 5 } } } },
          { text: { query: filters.requiredSkills, path: "specializations.skill",     score: { boost: { value: 4 } } } },
          { text: { query: filters.requiredSkills, path: "bio",                       score: { boost: { value: 1 } } } },
          { text: { query: filters.requiredSkills, path: "certifications",            score: { boost: { value: 2 } } } },
        ],
      },
    },
  },

  { $match: { bookingStatus: "available" } },

  // If a location resolved, compute distance. Otherwise skip and rely on rating + specialization.
  ...(filters.location ? [
    { $addFields: {
        distanceMeters: {
          $let: {
            vars: { p: filters.location.point },  // [lng, lat]
            in:   { $sqrt: {
              $add: [
                { $pow: [{ $multiply: [ { $subtract: [{ $arrayElemAt: ["$location.coordinates", 0] }, { $arrayElemAt: ["$$p", 0] }] }, 111000 * Math.cos(filters.location.latRad) ] }, 2] },
                { $pow: [{ $multiply: [ { $subtract: [{ $arrayElemAt: ["$location.coordinates", 1] }, { $arrayElemAt: ["$$p", 1] }] }, 111000 ] }, 2] },
              ]
            } }
          }
        }
    } },
    { $match: { distanceMeters: { $lte: filters.radiusMi * 1609 } } },
  ] : []),

  // Specialization score: sum of levels for matched skills, normalized.
  { $addFields: {
      matchedSpecs: {
        $filter: {
          input: "$specializations",
          as: "s",
          cond: { $in: ["$$s.skill", filters.requiredSkills] }
        }
      }
  } },
  { $addFields: {
      specializationScore: {
        $cond: [
          { $gt: [{ $size: filters.requiredSkills }, 0] },
          {
            $divide: [
              { $sum: "$matchedSpecs.level" },
              { $multiply: [ 5, { $size: filters.requiredSkills } ] }   // max possible
            ]
          },
          0.5   // neutral when no skills requested
        ]
      }
  } },

  { $addFields: {
      searchScore: { $meta: "searchScore" },
      geoScore: filters.location
        ? { $subtract: [1, { $divide: ["$distanceMeters", filters.radiusMi * 1609] }] }
        : 0.5,
      matchScore: {
        $add: [
          { $multiply: [{ $meta: "searchScore" },   0.30] },
          { $multiply: ["$specializationScore",     0.30] },
          { $multiply: [
              filters.location
                ? { $subtract: [1, { $divide: ["$distanceMeters", filters.radiusMi * 1609] }] }
                : 0.5,
              0.25
            ]
          },
          { $multiply: [{ $divide: ["$rating", 5] }, 0.15] },
        ]
      }
  } },

  { $sort: { matchScore: -1 } },
  { $limit: 10 },
  { $project: {
      name: 1, gender: 1, headshotUrl: 1, roles: 1, specializations: 1, matchedSpecs: 1,
      yearsExperience: 1, city: 1, county: 1, state: 1, hourlyRate: 1, rating: 1,
      certifications: 1, bookingStatus: 1, bio: 1,
      distanceMeters: 1, searchScore: 1, specializationScore: 1, matchScore: 1
  } },
]
```

Note: `$search` **must** be the first stage. `$geoNear` cannot always
follow `$search` in the same pipeline, so we compute distance manually
with the haversine-lite formula above. Accurate enough at SoCal latitudes
and orders of magnitude faster to reason about than fighting the
constraint.

## Score blend

| Signal | Weight | What it captures |
|---|---|---|
| `searchScore` (Atlas BM25) | 30% | Role + skill + bio text match strength |
| `specializationScore` | 30% | How deep this person is in the specific requested skills (avg level / 5, over requested skills) |
| `geoScore` (distance-based) | 25% | 1.0 at same city, 0.0 at edge of radius |
| `rating / 5` | 15% | Reputation |

Rationale for the weighting: with structured specializations we have a
real depth signal — a level-5 vinyl flooring specialist is meaningfully
different from a general flooring installer who's dabbled. Weighting it
equal to text-match strength (both at 30%) makes the ranker reward true
specialists for skill-specific queries while text match keeps the answer
reasonable when the query is loose.

## The `/api/search` flow

1. **Parse.** Call Groq (`openai/gpt-oss-120b`, JSON mode) → structured filters.
2. **Rank.** Call `ranker(filters)` → top 10.
3. **Rationale.** One batched Groq call: `[filters, top10]` → 10 rationale
   strings.
4. **Log.** Fire-and-forget `SearchLog.create({...})`.
5. **Respond.**

## The `/api/chat` flow

1. **LLM call with tools.** Pass `messages[]` + the `search_subcontractors`
   function-calling schema. LLM decides whether to invoke it.
2. **If tool call:** parse the args, execute `ranker(args)`, feed the tool
   result back to the LLM as a `role: "tool"` message.
3. **Second LLM call.** Model synthesizes an assistant message referencing
   the tool result ("Marcus is your best fit — local, expert on kitchen
   rewires, available now.").
4. **Log.** Fire-and-forget `ChatLog.create({...})` with the full
   transcript + tool-call record.
5. **Respond** with `{ assistant, toolCalls, latencyMs }`. The client
   renders the assistant text as a bubble and the tool result as a
   `<SubcontractorResults>` grid inline.

## Rationale generation (shared by both flows)

Single batched Groq call. Passes original ask + parsed filters + top 10
records; returns `{ rationales: [string] }` in the same order. If it fails,
template fallback:

```
${primaryRole}, ${yearsExperience} yrs, ${city} — ${topSpec.skill} at level ${topSpec.level}, ${bookingStatus}.
```

## Failure modes

| What breaks | What happens |
|---|---|
| Groq parse errors | Regex fallback parser runs; `parsedFilters._fallback = true` |
| Mongo returns 0 results | `results: []`, empty state on UI |
| Groq rationale errors | Template rationales substituted; still returns 10 |
| Groq tool call malformed | Return assistant message asking user to rephrase; no tool executed |
| Mongo down | 503 |
| Latency > 8s | Client aborts; server keeps running |
