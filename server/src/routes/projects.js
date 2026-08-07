import { Router } from "express";
import crypto from "node:crypto";
import { Project } from "../models/Project.js";
import { Subcontractor } from "../models/Subcontractor.js";

const router = Router();

// ─── LIST ─────────────────────────────────────────────────────────────────

router.get("/projects", async (req, res) => {
  const includeArchived = req.query.archived === "true";
  const filter = includeArchived ? {} : { status: { $ne: "archived" } };
  try {
    const projects = await Project.find(filter).sort({ updatedAt: -1 }).limit(100).lean({ virtuals: true });
    res.json({ projects });
  } catch (err) {
    console.error("projects list failed:", err.message);
    res.status(503).json({ error: "database unavailable" });
  }
});

// ─── CREATE ───────────────────────────────────────────────────────────────

router.post("/projects", async (_req, res) => {
  try {
    const project = await Project.create({
      name: "New project",
      chatSessionId: crypto.randomUUID(),
    });
    res.status(201).json({ project: project.toJSON() });
  } catch (err) {
    console.error("project create failed:", err.message);
    res.status(503).json({ error: "database unavailable" });
  }
});

// ─── FETCH ONE ────────────────────────────────────────────────────────────

router.get("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("crewRoster.filled")
      .populate("invitations.crew.subcontractorId")
      .lean({ virtuals: true });
    if (!project) return res.status(404).json({ error: "project not found" });
    res.json({ project });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "invalid project id" });
    console.error("project fetch failed:", err.message);
    res.status(503).json({ error: "database unavailable" });
  }
});

// ─── UPDATE (name / brief / crewRoster / status) ──────────────────────────

router.patch("/projects/:id", async (req, res) => {
  const allowed = ["name", "brief", "crewRoster", "status"];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate("crewRoster.filled")
      .lean({ virtuals: true });
    if (!project) return res.status(404).json({ error: "project not found" });
    res.json({ project });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "invalid project id" });
    console.error("project update failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── SELECT crew for a role slot ──────────────────────────────────────────

router.post("/projects/:id/select", async (req, res) => {
  const { role, subcontractorId } = req.body || {};
  if (!role || !subcontractorId) {
    return res.status(400).json({ error: "role and subcontractorId required" });
  }
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "project not found" });
    const slot = project.crewRoster.find((r) => r.role === role);
    if (!slot) return res.status(400).json({ error: `no roster slot for role: ${role}` });

    const already = slot.filled.some((id) => String(id) === String(subcontractorId));
    if (!already) {
      if (slot.filled.length >= slot.count) {
        return res.status(400).json({ error: `role ${role} slot already full (${slot.count})` });
      }
      slot.filled.push(subcontractorId);
    }
    await project.save();
    const populated = await Project.findById(project._id).populate("crewRoster.filled").lean({ virtuals: true });
    res.json({ project: populated });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "invalid id" });
    console.error("project select failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DESELECT crew from a role slot ───────────────────────────────────────

router.post("/projects/:id/deselect", async (req, res) => {
  const { role, subcontractorId } = req.body || {};
  if (!role || !subcontractorId) {
    return res.status(400).json({ error: "role and subcontractorId required" });
  }
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "project not found" });
    const slot = project.crewRoster.find((r) => r.role === role);
    if (!slot) return res.status(400).json({ error: `no roster slot for role: ${role}` });

    slot.filled = slot.filled.filter((id) => String(id) !== String(subcontractorId));
    await project.save();
    const populated = await Project.findById(project._id).populate("crewRoster.filled").lean({ virtuals: true });
    res.json({ project: populated });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "invalid id" });
    console.error("project deselect failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── INVITE (simulated) ───────────────────────────────────────────────────

router.post("/projects/:id/invite", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("crewRoster.filled");
    if (!project) return res.status(404).json({ error: "project not found" });

    const total = project.crewRoster.reduce((s, r) => s + r.count, 0);
    const filled = project.crewRoster.reduce((s, r) => s + Math.min(r.filled.length, r.count), 0);
    if (total === 0 || filled < total) {
      return res.status(400).json({
        error: `not all roles filled (${filled}/${total})`,
      });
    }

    const invitedAt = new Date();
    const invitations = [];
    for (const slot of project.crewRoster) {
      for (const crew of slot.filled.slice(0, slot.count)) {
        invitations.push({
          subcontractorId: crew._id,
          role: slot.role,
          invitedAt,
          calendarEventId: crypto.randomUUID(),
        });
      }
    }

    project.invitations = { sentAt: invitedAt, crew: invitations };
    project.status = "invited";
    await project.save();

    // Return with crew details populated for the modal
    const populated = await Project.findById(project._id)
      .populate("crewRoster.filled")
      .populate("invitations.crew.subcontractorId")
      .lean({ virtuals: true });

    res.json({
      project: populated,
      summary: {
        total: invitations.length,
        crew: populated.invitations.crew.map((i) => ({
          name: i.subcontractorId?.name || "(unknown)",
          role: i.role,
          calendarEventId: i.calendarEventId,
        })),
      },
    });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "invalid project id" });
    console.error("project invite failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── ARCHIVE (soft-delete) ────────────────────────────────────────────────

router.delete("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { status: "archived" }, { new: true }).lean();
    if (!project) return res.status(404).json({ error: "project not found" });
    res.json({ project });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ error: "invalid project id" });
    console.error("project archive failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
