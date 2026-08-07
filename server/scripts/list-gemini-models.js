// One-off probe: list all Gemini models the API key can see, and flag which
// support image generation. Kept as a script for repeat use whenever
// Google's model catalog shifts.

import { GoogleGenAI } from "@google/genai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey });

  const pager = await ai.models.list();
  const rows = [];
  for await (const m of pager) {
    rows.push(m);
  }

  console.log(`Total models: ${rows.length}\n`);
  console.log("Image-capable models (name contains 'image' or 'imagen'):");
  for (const m of rows) {
    const name = m.name || "";
    if (/image|imagen/i.test(name)) {
      const methods = (m.supportedActions || m.supportedGenerationMethods || []).join(", ");
      console.log(`  ${name}  [${methods}]`);
    }
  }

  console.log("\nAll model names:");
  for (const m of rows) {
    console.log(`  ${m.name}`);
  }
}

main().catch((err) => {
  console.error("list failed:", err.message);
  process.exit(1);
});
