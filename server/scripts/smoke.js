import mongoose from "mongoose";
import { connectDB } from "../src/db.js";
import { getLLM, MODEL } from "../src/llm.js";

async function main() {
  console.log("→ testing Mongo (local)...");
  const conn = await connectDB();
  const dbs = await conn.db.admin().listDatabases();
  console.log(`  ok. dbs: ${dbs.databases.map((d) => d.name).join(", ")}`);

  console.log(`→ testing Groq (${MODEL})...`);
  const t0 = Date.now();
  const llm = getLLM();
  const res = await llm.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: "Reply with exactly the word: pong" }],
    max_tokens: 10,
  });
  const content = res.choices?.[0]?.message?.content ?? "";
  console.log(`  ok. ${Date.now() - t0}ms, says: ${content.trim().slice(0, 60)}`);

  await mongoose.disconnect();
  console.log("✔ smoke test passed");
}

main().catch((err) => {
  console.error("✘ smoke test failed:", err.message);
  process.exit(1);
});
