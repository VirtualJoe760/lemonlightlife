import { Router } from "express";
import { rank } from "../ranker.js";
import { getLLM } from "../llm.js";
import { ChatLog } from "../models/ChatLog.js";
import { ROLE_KEYS } from "../../../shared/roles.js";
import { beginLog, loggedCompletion, recordToolCall, finalizeLog } from "../localLog.js";

const router = Router();

// Chat orchestration model: reliable tool-calling + natural synthesis text.
// gpt-oss-120b (a reasoning model) is used for /api/search parsing but
// truncates output when asked to produce longer strings inside its
// reasoning budget — use a non-reasoning model for chat.
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";

const CHAT_SYSTEM = `You are a helpful assistant that helps general contractors in Southern California find subcontractors for construction projects.

When the user describes a project need (a job, a role they need to hire, a specific skill), invoke the search_subcontractors tool to find matches from our roster. When the user asks a follow-up question about a specific person from the results, answer conversationally without invoking the tool again unless they ask for a fresh search.

When you get tool results back:
- ALWAYS reference results[0] (the top-ranked person) by name as your #1 recommendation. The ranker has already sorted by fit — do not second-guess it.
- Optionally mention results[1] as an alternative.
- Keep the message to 2–3 short sentences. The UI renders the full card grid separately, so do not list all matches in prose.
- Cite concrete details from the returned records (city, distance, top specialization + level, years of experience) — do not invent facts.

Be concise, friendly, and specific.`;

const SEARCH_TOOL = {
  type: "function",
  function: {
    name: "search_subcontractors",
    description: "Search the subcontractor database for people who match a project need. Use this whenever the user describes work they need done or asks for recommendations. Returns ranked matches (up to 10) with role, specializations, location, distance from job, availability, and rating.",
    parameters: {
      type: "object",
      properties: {
        roles: {
          type: "array",
          items: { type: "string", enum: ROLE_KEYS },
          description: "Construction role keys required for the job. Pick 1+ based on what the user described.",
        },
        requiredSkills: {
          type: "array",
          items: { type: "string" },
          description: "Specific skill phrases the job needs, e.g. 'vinyl flooring', 'kitchen rewire', 'chimney restoration'. Optional.",
        },
        location: {
          type: "object",
          properties: {
            city: { type: "string", description: "City name in Southern California" },
            state: { type: "string", description: "State code, always 'CA'" },
          },
          description: "Where the job is. Omit if the user hasn't specified.",
        },
        radiusMi: {
          type: "number",
          description: "Search radius in miles. Default 30; smaller (10-15) for same-day requests.",
        },
        urgencyDays: {
          type: "number",
          description: "0=today, 1=tomorrow, 7=this week, 30=anytime",
        },
      },
      required: ["roles"],
    },
  },
};

async function executeToolCall(toolCall) {
  let args = {};
  try {
    args = JSON.parse(toolCall.function.arguments || "{}");
  } catch (err) {
    console.warn("bad tool-call arguments:", toolCall.function.arguments);
    return { results: [], parsedFilters: {}, error: "bad tool arguments" };
  }
  const t0 = Date.now();
  const { results } = await rank(args);
  return {
    args,
    result: {
      results,
      parsedFilters: args,
    },
    latencyMs: Date.now() - t0,
  };
}

router.post("/chat", async (req, res) => {
  const t0 = Date.now();
  const sessionId = String(req.body?.sessionId || "").trim();
  const inbound = Array.isArray(req.body?.messages) ? req.body.messages : null;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }
  if (!inbound || inbound.length === 0 || inbound[inbound.length - 1].role !== "user") {
    return res.status(400).json({ error: "messages must be a non-empty array ending with a user message" });
  }

  const log = beginLog({ endpoint: "/api/chat", input: { sessionId, messages: inbound } });
  const llm = getLLM();
  const messages = [{ role: "system", content: CHAT_SYSTEM }, ...inbound];
  const toolCallRecords = [];

  let response;
  try {
    response = await loggedCompletion(log, "tool-decision", llm, {
      model: CHAT_MODEL,
      messages,
      tools: [SEARCH_TOOL],
      tool_choice: "auto",
      max_tokens: 800,
      temperature: 0.4,
    });
  } catch (err) {
    console.error("chat LLM call failed:", err.message);
    finalizeLog(log, null, `chat LLM call failed: ${err.message}`).catch(() => {});
    return res.status(502).json({ error: "chat model unavailable" });
  }

  let assistantMsg = response.choices?.[0]?.message;
  const toolCalls = assistantMsg?.tool_calls || [];

  // If the model invoked the search tool, execute it and do a second LLM
  // call for the synthesized human response.
  if (toolCalls.length > 0) {
    messages.push(assistantMsg);
    for (const tc of toolCalls) {
      try {
        const exec = await executeToolCall(tc);
        toolCallRecords.push({
          id: tc.id,
          name: tc.function.name,
          args: exec.args,
          resultIds: (exec.result?.results || []).map((r) => r._id),
          latencyMs: exec.latencyMs,
          result: exec.result,
        });
        recordToolCall(log, {
          name: tc.function.name,
          args: exec.args,
          result: exec.result,
          latencyMs: exec.latencyMs,
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            results: (exec.result?.results || []).map((r) => ({
              name: r.name,
              roles: r.roles,
              topSpecializations: [...(r.specializations || [])]
                .sort((a, b) => b.level - a.level).slice(0, 3)
                .map((s) => ({ skill: s.skill, level: s.level, years: s.yearsInSpecialty })),
              city: r.city,
              county: r.county,
              distanceMi: r.distanceMi,
              yearsExperience: r.yearsExperience,
              rating: r.rating,
              hourlyRate: r.hourlyRate,
              bookingStatus: r.bookingStatus,
              matchScore: r.matchScore,
            })),
            parsedFilters: exec.result.parsedFilters,
          }),
        });
      } catch (err) {
        console.error("tool execution failed:", err.message);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: "tool execution failed", results: [] }),
        });
      }
    }

    // Second call — model synthesizes a natural response using the tool result.
    try {
      const synthesis = await loggedCompletion(log, "synthesis", llm, {
        model: CHAT_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.5,
      });
      assistantMsg = synthesis.choices?.[0]?.message;
    } catch (err) {
      console.error("chat synthesis failed:", err.message);
      assistantMsg = { role: "assistant", content: "I found some matches — see the cards below." };
    }
  }

  const latencyMs = Date.now() - t0;

  // Fire-and-forget log.
  ChatLog.create({
    sessionId,
    messages: [...inbound, assistantMsg].map((m) => ({ role: m.role, content: m.content })),
    toolCalls: toolCallRecords.map((r) => ({
      name: r.name, args: r.args, resultIds: r.resultIds, latencyMs: r.latencyMs,
    })),
    latencyMs,
  }).catch((err) => console.error("chatlog write failed:", err.message));

  const responseBody = {
    assistant: { role: "assistant", content: assistantMsg?.content || "" },
    toolCalls: toolCallRecords.map((r) => ({
      id: r.id, name: r.name, args: r.args, result: r.result, latencyMs: r.latencyMs,
    })),
    latencyMs,
  };

  finalizeLog(log, responseBody).catch(() => {});

  res.json(responseBody);
});

export default router;
