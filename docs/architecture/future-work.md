# Future work / out-of-scope

The brief explicitly excludes these from the MVP but says "we may ask you how
you'd approach them." Each section below is designed to be answered in
2–3 minutes on the interview call, with a concrete approach and a named
tradeoff.

## Authentication

**Approach:** JWT-based, contractor is the primary principal.

- New `User` collection with `email`, `passwordHash` (argon2id), `role`
  (`contractor` | `admin`), `orgId`.
- New `Org` collection so multiple contractors at the same GC firm share a
  crew rolodex and search history.
- `POST /api/auth/login` issues a JWT with `{ userId, orgId, role, exp }`.
- Middleware on `/api/*` validates the JWT and attaches `req.user`.
- `SearchLog` gains `userId` + `orgId`. `crew` gains an optional `ownerOrgId`
  for private-to-org additions vs. the shared national pool.
- No refresh tokens in v1; 24h JWT is fine for a B2B tool. Add refresh
  when we need SSO.

**Tradeoff:** Roll-your-own vs Clerk/Auth0. Auth0 is faster to production and
gets us MFA/SSO for free. Roll-your-own is cheaper and keeps user data in one
database. For a contractor SaaS I'd probably start with Clerk to avoid the
compliance surface.

## Analytics

**Approach:** `SearchLog` is already the substrate. Layer on a lightweight
ETL to a warehouse.

- Nightly job dumps new `SearchLog` docs to BigQuery (or Snowflake / DuckDB
  Motherduck for cheap starts).
- Metabase or Superset dashboards on top of the warehouse.
- Key metrics to track from day one:
  - **Search volume** by city/state/role — where is demand growing
  - **No-result rate** by role/geo — where is the crew supply thin
  - **Match acceptance rate** (once we add a "book this crew" button and log
    that event) — direct signal of ranker quality
  - **Parser drift** — % of queries where `parsedFilters.roles` is empty or
    all-fallback
  - **Latency percentiles** — track p50/p95/p99 by stage (parse vs. rank vs.
    rationale) to know where to optimize

**Tradeoff:** Warehouse ETL vs. product analytics tool like Mixpanel. Mixpanel
is fantastic for event stream analysis but weaker for joining across search
history + booking outcomes. Since we own the data, warehouse.

## Cost optimization

Two knobs to turn, in this order:

1. **Cache the parser.** SHA-256(description) → parsedFilters, TTL 24h,
   stored in Redis or a Mongo capped collection. Cache hit rate should be
   surprisingly high — contractors reuse phrasings ("licensed electrician,"
   "same-day plumber"). This eliminates the parse Groq call for repeat
   queries.
2. **Drop the rationale LLM call** at high scale. Template rationale from
   the crew record fields is 80% as good and 100% free. Retain the LLM
   rationale for the top 1–2 results only; template for the rest.

Second-order: smaller/cheaper parse model. `gpt-oss-20b` on Groq is
probably sufficient for structured extraction; A/B test parser output
quality against `gpt-oss-120b` before switching.

**Tradeoff:** Caching parser output means we don't retrain the parser
regularly. Fine for now — we can bust cache when we ship a new prompt.

## Date/time availability

**Approach:** New `AvailabilityWindow` collection, indexed by crew + date range.

```
{
  crewId: ObjectId,
  from: Date,
  to: Date,
  status: "available" | "booked" | "off"
}
```

- On each search, compute the query's project window from `urgencyDays` +
  optional user-supplied end date.
- Aggregation adds `$lookup` on `availabilitywindows` filtered to overlap
  the project window, then `$match { availWindow: { $exists: true } }`.

**Tradeoff:** `$lookup` on every search costs. Alternative: denormalize a
`nextAvailableDate` field onto each `crew` record, updated by a nightly job
+ webhook on booking changes. Cheaper reads, staler data. For a real
product I'd start with denormalized + eventual consistency.

## Other pages beyond search

- **Crew detail page** (`/crew/:id`): full profile, portfolio photos, past
  contractor reviews, direct-message button.
- **Booking flow**: click a crew card → confirm dates → notification to
  crew's phone → status flips to `booked`.
- **Contractor dashboard**: past searches, in-progress bookings, favorites.
- **Admin crew management** (for the ops team): CRUD, verify licenses, flag
  duplicates.

All standard CRUD. React Router for client routing, Express routes prefixed
by resource. The important architectural question is where **licensed
verification** goes — probably a separate microservice consuming state
licensing board APIs, since that's a compliance surface.

## Vector search / semantic matching

**When it starts mattering:** queries that don't map cleanly to the role
vocabulary. "Someone who's good with historic homes" — no such role, but
some carpenters and masons specialize in restoration. BM25 handles this
weakly at best; embeddings handle it well.

**Approach:**
1. Pre-embed each crew's `bio + skills + certifications` using
   `text-embedding-3-small` (OpenAI) or a Groq-hosted embedding model.
2. Store the vector on the crew record. Atlas has vector search — add a
   second search index of type `vectorSearch`.
3. In the aggregation, add a `$vectorSearch` stage in parallel with
   `$search` (BM25), take a rank-fusion of both scores.
4. The parser prompt gets a new output field: `semanticQuery` — a rephrased
   version of the description optimized for embedding matching.

**Tradeoff:** Vectors cost storage + embedding-time on every crew update.
For 10k crew this is negligible; for 1M crew it starts to matter. Also, BM25
is more explainable ("we matched because their bio contains 'historic
restoration'"). Vectors are a black box. In the interview I'd argue for
hybrid (both signals) not replacement.

## Provider redundancy

If Groq is down, the whole product is degraded. Two mitigations:

- **Circuit breaker** in `getLLM()` — if 3 consecutive calls fail, skip LLM
  for 5 min and use the regex parser + template rationale. Users get service,
  quality drops.
- **Secondary provider config.** Env var `LLM_SECONDARY_BASE_URL` +
  `LLM_SECONDARY_API_KEY` + `LLM_SECONDARY_MODEL`. When circuit breaker
  trips, retry on secondary. Ollama Cloud, DeepInfra, and Together.ai all
  serve OpenAI-compatible endpoints for the same class of open models.

## What I'd build second (if we ship this MVP)

In order:

1. **Accept/reject button** on each result card + `matches.accepted` event
   logged — that's the training signal we need to move beyond keyword+geo
   scoring.
2. **Parser cache** — cheapest cost win.
3. **Availability windows** — biggest UX unlock (day-before crew swaps are
   the highest-pain use case per the brief).
4. **Auth + orgs** — needed before any real customer touches this.
5. **Vector rerank** — quality unlock for fuzzy queries.
