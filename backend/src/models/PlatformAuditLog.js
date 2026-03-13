const mongoose = require("mongoose");

const PlatformAuditLogSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorName: { type: String, trim: true, default: "" },
    actorRole: { type: String, trim: true, default: "" },
    actionType: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    beforeSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    afterSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

PlatformAuditLogSchema.index({ createdAt: -1 });
PlatformAuditLogSchema.index({ companyId: 1, createdAt: -1 });
PlatformAuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
PlatformAuditLogSchema.index({ actionType: 1, createdAt: -1 });

module.exports = mongoose.model("PlatformAuditLog", PlatformAuditLogSchema);
