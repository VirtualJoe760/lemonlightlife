import { Router } from "express";
import { rank } from "../ranker.js";
import { getLLM } from "../llm.js";
import { ChatLog } from "../models/ChatLog.js";
import { Project } from "../models/Project.js";
import { ROLE_KEYS } from "../../../shared/roles.js";
import { beginLog, loggedCompletion, recordToolCall, finalizeLog } from "../localLog.js";

const router = Router();

const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";

// ─── System prompts ───────────────────────────────────────────────────────

const GENERIC_SYSTEM = `You are a helpful assistant that helps general contractors in Southern California find subcontractors for construction projects.

When the user describes a project need, invoke the search_subcontractors tool. On tool results:
- ALWAYS reference results[0] (the top-ranked person) by name as your #1 recommendation. The ranker has already sorted by fit.
- Optionally mention results[1] as an alternative.
- Keep the message to 2–3 short sentences. The UI renders the card grid separately.
- Cite concrete details from the returned records; do not invent facts.

Be concise, friendly, and specific.`;

function projectSystemPrompt(project) {
  const b = project.brief || {};
  const rosterSummary = (project.crewRoster || []).map((r) =>
    `  - ${r.role} (${r.filled?.length || 0}/${r.count} filled): ${r.reason}`
  ).join("\n") || "  (none yet)";

  return `You are the guide for building out a construction project for a general contractor in Southern California. Your job in this conversation depends on the current PROJECT STATE below.

CURRENT PROJECT STATE
- Name: ${project.name}
- Status: ${project.status}
- Brief:
    where: ${b.where?.city ? `${b.where.city}, ${b.where.state || "CA"}` : "(unknown)"}
    when: ${b.when || "(unknown)"}
    what: ${b.what || "(unknown)"}
    budget: ${b.budget || "(unknown)"}
    complete: ${b.complete ? "yes" : "no"}
- Crew roster:
${rosterSummary}

YOUR JOB — depends on the phase:

If brief.complete = no AND status = "brief":
  You are gathering the project brief through natural conversation. Ask ONE guided question at a time to fill in gaps (starting with 'what' if unknown, then location, then timing). Call the update_project_brief tool EVERY time you learn something new (a location, a timing, a description update). Do not call propose_crew_roster until you at least know the 'what'. Keep replies short and friendly.

Once you have enough (minimum: 'what', ideally 'where' too), call propose_crew_roster to compose the crew composition. Then in your text response, briefly summarize what you've composed and mention you'll pull up candidates.

If status = "selecting":
  The brief is done and the crew composition is proposed. When the user asks for candidates for a specific role, call search_subcontractors for that role. When the user wants to swap someone out ("find me a different tile setter"), also call search_subcontractors with the appropriate role. Answer follow-up questions about specific people without calling the tool again.

If status = "invited":
  The project is complete — all crew invited. Answer any follow-up questions conversationally. Do not call tools.

TOOL USE RULES:
- Only call one tool per turn unless the user's request clearly needs multiple.
- After a tool call, the tool result comes back and you produce the human-facing reply.
- Never invent details not present in tool results or user messages.

TONE: concise, warm, specific. Two to four sentences per reply unless the user asks for detail.`;
}

// ─── Tool schemas ─────────────────────────────────────────────────────────

const SEARCH_TOOL = {
  type: "function",
  function: {
    name: "search_subcontractors",
    description: "Search the subcontractor database for people who match a project need. Returns ranked matches (up to 10).",
    parameters: {
      type: "object",
      properties: {
        roles: {
          type: "array",
          items: { type: "string", enum: ROLE_KEYS },
          description: "Construction role keys required. Pick 1+.",
        },
        requiredSkills: { type: "array", items: { type: "string" } },
        location: {
          type: "object",
          properties: { city: { type: "string" }, state: { type: "string" } },
        },
        radiusMi: { type: "number" },
        urgencyDays: { type: "number" },
      },
      required: ["roles"],
    },
  },
};

const UPDATE_BRIEF_TOOL = {
  type: "function",
  function: {
    name: "update_project_brief",
    description: "Update the current project's brief with details the contractor just shared. Call this every time you learn something concrete. Do NOT set fields you haven't heard yet.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short project name if it makes sense to give it one" },
        where: {
          type: "object",
          properties: { city: { type: "string" }, state: { type: "string" } },
        },
        when: { type: "string", enum: ["today", "tomorrow", "this-week", "this-month", "flexible"] },
        what: { type: "string", description: "Short description of the project" },
        budget: { type: "string", enum: ["under-1k", "1-5k", "5-25k", "25k+"] },
      },
    },
  },
};

const PROPOSE_ROSTER_TOOL = {
  type: "function",
  function: {
    name: "propose_crew_roster",
    description: "Once you have enough project detail (at minimum the 'what'), propose the crew composition. One entry per trade needed; count usually 1.",
    parameters: {
      type: "object",
      properties: {
        roles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ROLE_KEYS },
              count: { type: "number", minimum: 1, maximum: 5 },
              reason: { type: "string" },
            },
            required: ["role", "count", "reason"],
          },
        },
      },
      required: ["roles"],
    },
  },
};

// ─── Tool executors ──────────────────────────────────────────────────────

async function execSearchSubcontractors(args) {
  const t0 = Date.now();
  const { results } = await rank(args);
  return {
    kind: "search",
    result: { results, parsedFilters: args },
    latencyMs: Date.now() - t0,
  };
}

async function execUpdateProjectBrief(project, args) {
  const t0 = Date.now();
  if (args.name) project.name = args.name;
  if (args.where) {
    project.brief.where = {
      city: args.where.city || project.brief.where?.city || null,
      state: args.where.state || project.brief.where?.state || "CA",
    };
  }
  if (args.when) project.brief.when = args.when;
  if (args.what) project.brief.what = args.what;
  if (args.budget) project.brief.budget = args.budget;
  await project.save();
  return {
    kind: "brief-update",
    result: { brief: project.brief, name: project.name },
    latencyMs: Date.now() - t0,
    projectUpdated: true,
  };
}

async function execProposeCrewRoster(project, args) {
  const t0 = Date.now();
  const existingByRole = new Map(project.crewRoster.map((r) => [r.role, r]));
  project.crewRoster = (args.roles || []).map((r) => {
    const existing = existingByRole.get(r.role);
    return {
      role: r.role,
      count: r.count,
      reason: r.reason,
      filled: existing?.filled || [],
    };
  });
  project.brief.complete = true;
  // pre-save hook will flip status to "selecting" if conditions met
  await project.save();
  return {
    kind: "roster-proposed",
    result: { crewRoster: project.crewRoster, status: project.status },
    latencyMs: Date.now() - t0,
    projectUpdated: true,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────

router.post("/chat", async (req, res) => {
  const t0 = Date.now();
  const sessionId = String(req.body?.sessionId || "").trim();
  const projectId = req.body?.projectId ? String(req.body.projectId) : null;
  const inbound = Array.isArray(req.body?.messages) ? req.body.messages : null;

  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  if (!inbound || inbound.length === 0 || inbound[inbound.length - 1].role !== "user") {
    return res.status(400).json({ error: "messages must be a non-empty array ending with a user message" });
  }

  const log = beginLog({ endpoint: "/api/chat", input: { sessionId, projectId, messages: inbound } });

  // Fetch project if in project-context mode
  let project = null;
  let tools = [SEARCH_TOOL];
  let systemPrompt = GENERIC_SYSTEM;
  if (projectId) {
    try {
      project = await Project.findById(projectId).populate("crewRoster.filled");
      if (!project) {
        finalizeLog(log, null, "project not found").catch(() => {});
        return res.status(404).json({ error: "project not found" });
      }
      systemPrompt = projectSystemPrompt(project);
      tools = [SEARCH_TOOL, UPDATE_BRIEF_TOOL, PROPOSE_ROSTER_TOOL];
    } catch (err) {
      if (err.name === "CastError") return res.status(400).json({ error: "invalid projectId" });
      throw err;
    }
  }

  const llm = getLLM();
  const messages = [{ role: "system", content: systemPrompt }, ...inbound];
  const toolCallRecords = [];
  let projectUpdated = false;

  let response;
  try {
    response = await loggedCompletion(log, "tool-decision", llm, {
      model: CHAT_MODEL,
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 800,
      temperature: 0.4,
    });
  } catch (err) {
    console.error("chat LLM failed:", err.message);
    finalizeLog(log, null, `chat LLM failed: ${err.message}`).catch(() => {});
    return res.status(502).json({ error: "chat model unavailable" });
  }

  let assistantMsg = response.choices?.[0]?.message;
  const toolCalls = assistantMsg?.tool_calls || [];

  if (toolCalls.length > 0) {
    messages.push(assistantMsg);
    for (const tc of toolCalls) {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch { /* bad args — treat as empty */ }

      let exec;
      try {
        if (tc.function.name === "search_subcontractors") {
          exec = await execSearchSubcontractors(args);
        } else if (tc.function.name === "update_project_brief" && project) {
          exec = await execUpdateProjectBrief(project, args);
          projectUpdated = true;
        } else if (tc.function.name === "propose_crew_roster" && project) {
          exec = await execProposeCrewRoster(project, args);
          projectUpdated = true;
        } else {
          exec = { kind: "unknown", result: { error: `unknown tool: ${tc.function.name}` }, latencyMs: 0 };
        }

        toolCallRecords.push({
          id: tc.id,
          name: tc.function.name,
          kind: exec.kind,
          args,
          result: exec.result,
          latencyMs: exec.latencyMs,
        });
        recordToolCall(log, {
          name: tc.function.name,
          args,
          result: exec.result,
          latencyMs: exec.latencyMs,
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(exec.result),
        });
      } catch (err) {
        console.error(`tool ${tc.function.name} failed:`, err.message);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: err.message }),
        });
      }
    }

    // Second call — synthesize
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
      assistantMsg = { role: "assistant", content: "Working on it — the details are updated." };
    }
  }

  const latencyMs = Date.now() - t0;
  const responseBody = {
    assistant: { role: "assistant", content: assistantMsg?.content || "" },
    toolCalls: toolCallRecords,
    projectUpdated,
    latencyMs,
  };

  ChatLog.create({
    sessionId,
    messages: [...inbound, assistantMsg].map((m) => ({ role: m.role, content: m.content })),
    toolCalls: toolCallRecords.map((r) => ({ name: r.name, args: r.args, latencyMs: r.latencyMs })),
    latencyMs,
  }).catch((err) => console.error("chatlog write failed:", err.message));

  finalizeLog(log, responseBody).catch(() => {});

  res.json(responseBody);
});

export default router;
