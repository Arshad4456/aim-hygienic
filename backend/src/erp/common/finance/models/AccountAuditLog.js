const mongoose = require("mongoose");

const AccountAuditLogSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    action: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    metadata: { type: Object, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("AccountAuditLog", AccountAuditLogSchema);