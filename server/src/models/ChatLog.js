import mongoose from "mongoose";

const ChatLogSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    messages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    toolCalls: { type: [mongoose.Schema.Types.Mixed], default: [] },
    latencyMs: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "chatlogs" }
);

export const ChatLog =
  mongoose.models.ChatLog || mongoose.model("ChatLog", ChatLogSchema);
