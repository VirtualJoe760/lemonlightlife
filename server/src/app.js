// Express app builder. Split out from index.js so it can be reused by:
//   - local dev (server/src/index.js -> app.listen)
//   - Vercel serverless function (api/[[...path]].js -> app(req, res))

import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import searchRouter from "./routes/search.js";
import chatRouter from "./routes/chat.js";
import subcontractorsRouter from "./routes/subcontractors.js";
import projectsRouter from "./routes/projects.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Public — no DB dependency
app.get("/", (_req, res) =>
  res
    .type("text/plain")
    .send("Kristel Match API. Frontend runs on http://localhost:5173 (dev)")
);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// DB gate: reuse the mongoose connection across serverless invocations.
let dbConnection = null;
async function ensureDB() {
  if (dbConnection) return dbConnection;
  dbConnection = connectDB().catch((err) => { dbConnection = null; throw err; });
  return dbConnection;
}
app.use("/api", async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error("db connect failed:", err.message);
    res.status(503).json({ error: "database unavailable" });
  }
});

app.use("/api", searchRouter);
app.use("/api", chatRouter);
app.use("/api", subcontractorsRouter);
app.use("/api", projectsRouter);

export default app;
