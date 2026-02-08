const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    body: { type: String, trim: true },
    senderName: { type: String, trim: true },
    senderRole: { type: String, trim: true },
    recipientRole: { type: String, trim: true },
    relatedEntity: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
