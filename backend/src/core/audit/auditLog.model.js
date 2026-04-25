const mongoose = require("mongoose");
const AuditLogSchema = new mongoose.Schema({ companyId: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, module: String, action: String, oldValue: mongoose.Schema.Types.Mixed, newValue: mongoose.Schema.Types.Mixed, ipAddress: String, device: String }, { timestamps: true });
module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
