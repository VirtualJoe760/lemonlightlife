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
