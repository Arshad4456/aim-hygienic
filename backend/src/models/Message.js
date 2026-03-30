const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    body: { type: String, trim: true },
    type: { type: String, trim: true, default: "general" },
    priority: { type: String, enum: ["low", "normal", "high", "critical"], default: "normal" },
    senderUserId: { type: String, trim: true },
    senderName: { type: String, trim: true },
    senderRole: { type: String, trim: true },
    recipientRole: { type: String, trim: true },
    relatedEntity: { type: String, trim: true },
    readByUserIds: [{ type: String, trim: true }],
    lastPushedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
