import mongoose from "mongoose";

const BriefSchema = new mongoose.Schema(
  {
    where: {
      city: { type: String, default: null },
      state: { type: String, default: "CA" },
    },
    when: {
      type: String,
      enum: ["today", "tomorrow", "this-week", "this-month", "flexible", null],
      default: null,
    },
    what: { type: String, default: null },
    startDateTime: { type: Date, default: null },
    budget: {
      type: String,
      enum: ["under-1k", "1-5k", "5-25k", "25k+", null],
      default: null,
    },
    complete: { type: Boolean, default: false },
  },
  { _id: false }
);

const RosterSlotSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    count: { type: Number, required: true, min: 1, max: 10 },
    reason: { type: String, default: "" },
    filled: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subcontractor" }],
  },
  { _id: false }
);

const InvitationRecordSchema = new mongoose.Schema(
  {
    subcontractorId: { type: mongoose.Schema.Types.ObjectId, ref: "Subcontractor", required: true },
    role: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    calendarEventId: { type: String, required: true },
  },
  { _id: false }
);

const InvitationsSchema = new mongoose.Schema(
  {
    sentAt: { type: Date, default: null },
    crew: { type: [InvitationRecordSchema], default: [] },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Untitled project" },
    brief: { type: BriefSchema, default: () => ({}) },
    crewRoster: { type: [RosterSlotSchema], default: [] },
    chatSessionId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["brief", "selecting", "invited", "archived"],
      default: "brief",
      index: true,
    },
    invitations: { type: InvitationsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "projects" }
);

ProjectSchema.index({ updatedAt: -1 });

// Virtual: how many crew slots are needed vs filled
ProjectSchema.virtual("selectionProgress").get(function () {
  const total = (this.crewRoster || []).reduce((s, r) => s + r.count, 0);
  const filled = (this.crewRoster || []).reduce((s, r) => s + Math.min(r.filled.length, r.count), 0);
  return { filled, total };
});
ProjectSchema.set("toJSON", { virtuals: true });
ProjectSchema.set("toObject", { virtuals: true });

// Auto-transition status when brief.complete + roster proposed
ProjectSchema.pre("save", function (next) {
  if (this.status === "brief" && this.brief?.complete && this.crewRoster?.length > 0) {
    this.status = "selecting";
  }
  next();
});

export const Project =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);
