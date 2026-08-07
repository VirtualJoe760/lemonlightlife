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

app.get("/", (_req, res) =>
  res
    .type("text/plain")
    .send("Construction Matchmaker API. Frontend runs on http://localhost:5173")
);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", searchRouter);
app.use("/api", chatRouter);
app.use("/api", subcontractorsRouter);
app.use("/api", projectsRouter);

const PORT = process.env.PORT || 3001;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`server listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });
