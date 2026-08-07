import { Router } from "express";
import { Subcontractor } from "../models/Subcontractor.js";
import { ROLE_KEYS } from "../../../shared/roles.js";

const router = Router();

// Simple browse endpoint for the Team page. Filter by role + county +
// availability, keep it fast (no LLM, no ranker). Read-only, no logging.
router.get("/subcontractors", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const role = typeof req.query.role === "string" && ROLE_KEYS.includes(req.query.role) ? req.query.role : null;
  const county = typeof req.query.county === "string" ? req.query.county : null;
  const availableOnly = req.query.available !== "false"; // default true

  const filter = {};
  if (role) filter.roles = role;
  if (county) filter.county = county;
  if (availableOnly) filter.bookingStatus = "available";

  try {
    const [results, total] = await Promise.all([
      Subcontractor.find(filter).sort({ rating: -1, yearsExperience: -1 }).limit(limit).lean(),
      Subcontractor.countDocuments(filter),
    ]);
    res.json({ results, total });
  } catch (err) {
    console.error("subcontractors browse failed:", err.message);
    res.status(503).json({ error: "database unavailable" });
  }
});

export default router;
