// Local, filesystem-based logging for LLM interactions. Meant for developer
// inspection during prompt tuning — every route request that touches Groq
// produces one pretty-printed JSON file in /local-logs/ at repo root.
//
// This is separate from the Mongo-backed SearchLog and ChatLog, which are the
// production audit trail. This one is verbose, gitignored, and safe to blow
// away between iterations.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../local-logs");

let dirEnsured = false;
async function ensureDir() {
  if (dirEnsured) return;
  await fs.mkdir(LOG_DIR, { recursive: true });
  dirEnsured = true;
}

/**
 * Start a new log context for an API request.
 * @param {{ endpoint: string, input: any, meta?: object }} meta
 */
export function beginLog({ endpoint, input, ...extra }) {
  return {
    startedAt: new Date().toISOString(),
    startedAtMs: Date.now(),
    requestId: crypto.randomUUID(),
    endpoint,
    input,
    extra,
    llmCalls: [],
    toolCalls: [],
    output: null,
    error: null,
    totalLatencyMs: null,
  };
}

/**
 * Wrap an OpenAI-SDK chat.completions.create call and record it into the log.
 * Passes through both success and failure — throws whatever the SDK throws.
 *
 * @param {object} log - context from beginLog()
 * @param {string} purpose - short label ("parse", "rationale", "chat", "synthesis")
 * @param {object} llm - the OpenAI SDK client
 * @param {object} opts - the same options you'd pass to chat.completions.create
 */
export async function loggedCompletion(log, purpose, llm, opts) {
  const t0 = Date.now();
  const entry = {
    purpose,
    model: opts.model,
    messages: opts.messages,
    tools: opts.tools,
    response_format: opts.response_format,
    temperature: opts.temperature,
    max_tokens: opts.max_tokens,
  };
  try {
    const res = await llm.chat.completions.create(opts);
    entry.response = res;
    entry.latencyMs = Date.now() - t0;
    log.llmCalls.push(entry);
    return res;
  } catch (err) {
    entry.error = err.message;
    entry.latencyMs = Date.now() - t0;
    log.llmCalls.push(entry);
    throw err;
  }
}

/**
 * Record a tool invocation and its result into the log.
 */
export function recordToolCall(log, { name, args, result, latencyMs, error }) {
  log.toolCalls.push({ name, args, result, latencyMs, error });
}

/**
 * Write the log to disk as one pretty-printed JSON file. Fire-and-forget from
 * callers — this MUST never block or fail a response.
 *
 * Filename: {ISO-timestamp}_{endpoint-slug}_{shortId}.json
 */
export async function finalizeLog(log, output, error = null) {
  log.output = output;
  log.error = error;
  log.totalLatencyMs = Date.now() - log.startedAtMs;

  try {
    await ensureDir();
    const stamp = log.startedAt.replace(/[:.]/g, "-");
    const slug = log.endpoint.replace(/^\//, "").replace(/\//g, "_");
    const short = log.requestId.slice(0, 8);
    const filename = `${stamp}_${slug}_${short}.json`;
    await fs.writeFile(path.join(LOG_DIR, filename), JSON.stringify(log, null, 2));
  } catch (err) {
    console.error("localLog finalize failed:", err.message);
  }
}
