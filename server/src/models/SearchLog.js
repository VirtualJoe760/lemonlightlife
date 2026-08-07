import mongoose from "mongoose";

const SearchLogSchema = new mongoose.Schema(
  {
    query: { type: String, required: true },
    parsedFilters: { type: mongoose.Schema.Types.Mixed, default: {} },
    resultIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subcontractor" }],
    topRationales: { type: [String], default: [] },
    latencyMs: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "searchlogs" }
);

export const SearchLog =
  mongoose.models.SearchLog || mongoose.model("SearchLog", SearchLogSchema);
