import { Router } from "express";
import { rank } from "../ranker.js";
import { getLLM, MODEL } from "../llm.js";

// gpt-oss-120b is a reasoning model — great for structured extraction (the
// parser prompt below) but liable to burn all tokens on internal analysis
// when asked to produce longer outputs like the batched rationales. Use a
// non-reasoning model for the rationale step. Configurable but sensible
// default is llama-3.3-70b-versatile on Groq.
const RATIONALE_MODEL = process.env.GROQ_RATIONALE_MODEL || "llama-3.3-70b-versatile";
import { SearchLog } from "../models/SearchLog.js";
import { ROLE_KEYS, ROLES } from "../../../shared/roles.js";
import { beginLog, loggedCompletion, finalizeLog } from "../localLog.js";

const router = Router();

const PARSER_SYSTEM = `You extract structured filters from a natural-language construction project description written by a general contractor operating in Southern California.

Return valid JSON matching this schema exactly:

{
  "roles":          string[],           // pick 0+ keys from the ROLES vocabulary. lowercase, exact match.
  "requiredSkills": string[],           // short skill phrases mentioned or implied (e.g. "kitchen rewire", "shingle replacement", "vinyl plank")
  "location":       { "city": string, "state": string } | null,
  "radiusMi":       number,             // reasonable default 30; smaller for same-day requests
  "urgencyDays":    number,             // 0=today, 1=tomorrow, 7=this week, 30=anytime
  "projectType":    "residential" | "commercial" | "mixed"
}

ROLES vocabulary: [${ROLE_KEYS.join(", ")}]

Rules:
- Return ONLY the JSON object. No prose, no markdown fences, no code blocks.
- If a role isn't explicitly named but is implied by the task (e.g. "rewire" → electrician, "reshingle" → roofer, "kitchen remodel" → carpenter+plumber+electrician), include the implied role(s).
- Locations should be Southern California cities (LA, Orange, Riverside, San Bernardino, San Diego, Imperial counties). Set to null if ambiguous or missing.
- If urgency is unclear, default urgencyDays to 7.
- If project type is unclear, default to "residential".`;

const RATIONALE_SYSTEM = `You explain why each construction subcontractor is a strong fit for the contractor's request. Write one short sentence per crew member (max ~22 words), referencing concrete details: role, distance to job, standout specialization + level, years of experience, or certification.

Output ONLY a JSON object of the exact shape { "rationales": string[] } with one string per crew member in the same order as the input. No prose before or after. No markdown fences. No thinking-out-loud.

Be specific and honest. If someone is a weaker role match, lead with what they DO bring (proximity, availability, standout skill) rather than overselling.`;

// ─── Fallback parser ────────────────────────────────────────────────────────

function fallbackParse(description) {
  const d = description.toLowerCase();
  const foundRoles = new Set();
  for (const role of ROLES) {
    for (const alias of role.aliases) {
      if (d.includes(alias.toLowerCase())) { foundRoles.add(role.key); break; }
    }
  }

  // Very loose city extraction — look for "in <TitleCase City>" patterns.
  let location = null;
  const inMatch = description.match(/\bin\s+([A-Z][a-zA-Z\s]{2,30}?)(?=[,\.\?!]|\s+(?:for|to|next|tomorrow|today|this|by|with|—|-|\s*$))/);
  if (inMatch) {
    location = { city: inMatch[1].trim(), state: "CA" };
  }

  const urgencyDays = /tomorrow|next day|day before/.test(d) ? 1
    : /today|now|asap|urgent/.test(d) ? 0
    : /this week|couple days|few days/.test(d) ? 3
    : /next week/.test(d) ? 7
    : 7;

  return {
    roles: [...foundRoles],
    requiredSkills: [],
    location,
    radiusMi: 30,
    urgencyDays,
    projectType: "residential",
    _fallback: true,
  };
}

function templateRationale(crew) {
  const top = [...(crew.specializations || [])].sort((a, b) => b.level - a.level)[0];
  const bits = [
    `${crew.roles[0]}`,
    `${crew.yearsExperience} yrs`,
    top ? `${top.skill} L${top.level}` : null,
    crew.city ? `${crew.city}` : null,
    crew.distanceMi != null ? `${crew.distanceMi} mi` : null,
    `${crew.bookingStatus}`,
  ].filter(Boolean);
  return bits.join(" · ");
}

// ─── LLM helpers ────────────────────────────────────────────────────────────

async function llmParse(log, description) {
  const llm = getLLM();
  const res = await loggedCompletion(log, "parse", llm, {
    model: MODEL,
    messages: [
      { role: "system", content: PARSER_SYSTEM },
      { role: "user", content: description },
    ],
    response_format: { type: "json_object" },
    max_tokens: 400,
    temperature: 0.1,
  });
  const content = res.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content);
  // Normalize: filter roles to canonical vocab.
  const canonical = new Set(ROLE_KEYS);
  parsed.roles = (parsed.roles || []).filter((r) => canonical.has(r));
  parsed.requiredSkills = parsed.requiredSkills || [];
  return parsed;
}

async function llmRationales(log, description, parsedFilters, results) {
  const llm = getLLM();
  const trimmed = results.map((r) => ({
    name: r.name,
    roles: r.roles,
    topSpecializations: [...(r.specializations || [])]
      .sort((a, b) => b.level - a.level)
      .slice(0, 4)
      .map((s) => ({ skill: s.skill, level: s.level, years: s.yearsInSpecialty })),
    city: r.city,
    county: r.county,
    yearsExperience: r.yearsExperience,
    rating: r.rating,
    distanceMi: r.distanceMi,
    bookingStatus: r.bookingStatus,
    certifications: r.certifications,
  }));

  const userMsg = `Contractor request: "${description}"
Parsed as: ${JSON.stringify(parsedFilters)}

Crew (ranked, top ${trimmed.length}):
${JSON.stringify(trimmed, null, 2)}`;

  const res = await loggedCompletion(log, "rationale", llm, {
    model: RATIONALE_MODEL,
    messages: [
      { role: "system", content: RATIONALE_SYSTEM },
      { role: "user", content: userMsg },
    ],
    response_format: { type: "json_object" },
    max_tokens: 900,
    temperature: 0.4,
  });
  const msg = res.choices?.[0]?.message ?? {};
  const content = msg.content ?? "";
  const reasoning = msg.reasoning ?? msg.reasoning_content ?? "";
  const combined = content || reasoning;
  if (!combined) {
    console.warn("rationale response empty; keys on message:", Object.keys(msg));
    throw new Error("empty LLM response");
  }
  // gpt-oss reasoning models sometimes route the final answer to `reasoning`
  // rather than `content`; extract the first {...} block from whichever we got.
  const jsonMatch = combined.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("no JSON in response. first 400 chars of content:", content.slice(0, 400));
    console.warn("first 400 chars of reasoning:", reasoning.slice(0, 400));
    throw new Error("no JSON object found in LLM response");
  }
  const { rationales } = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(rationales)) throw new Error("rationales missing from LLM response");
  return rationales;
}

// ─── Route handler ─────────────────────────────────────────────────────────

router.post("/search", async (req, res) => {
  const t0 = Date.now();
  const description = String(req.body?.description || "").trim().slice(0, 1000);
  if (!description) {
    return res.status(400).json({ error: "description must be a non-empty string" });
  }

  const log = beginLog({ endpoint: "/api/search", input: { description } });

  let parsedFilters;
  try {
    parsedFilters = await llmParse(log, description);
  } catch (err) {
    console.warn("parse LLM failed, using regex fallback:", err.message);
    parsedFilters = fallbackParse(description);
  }

  let ranked;
  try {
    ranked = await rank(parsedFilters);
  } catch (err) {
    console.error("ranker failed:", err);
    finalizeLog(log, null, `ranker failed: ${err.message}`).catch(() => {});
    return res.status(503).json({ error: "database unavailable" });
  }
  const { results } = ranked;

  // Rationales — batched LLM call, fall back to templates on failure.
  let rationales;
  if (results.length === 0) {
    rationales = [];
  } else {
    try {
      rationales = await llmRationales(log, description, parsedFilters, results);
      if (rationales.length !== results.length) {
        console.warn("rationale count mismatch; falling back to templates");
        rationales = results.map(templateRationale);
      }
    } catch (err) {
      console.warn("rationale LLM failed, using templates:", err.message);
      rationales = results.map(templateRationale);
    }
  }

  const enriched = results.map((r, i) => ({ ...r, rationale: rationales[i] || templateRationale(r) }));
  const latencyMs = Date.now() - t0;
  const responseBody = { results: enriched, parsedFilters, latencyMs };

  // Fire-and-forget logs — never block the response.
  SearchLog.create({
    query: description,
    parsedFilters,
    resultIds: enriched.map((r) => r._id),
    topRationales: enriched.map((r) => r.rationale),
    latencyMs,
  }).catch((err) => console.error("searchlog write failed:", err.message));

  finalizeLog(log, responseBody).catch(() => {});

  res.json(responseBody);
});

export default router;
