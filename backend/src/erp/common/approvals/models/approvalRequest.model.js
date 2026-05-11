const mongoose = require("mongoose");
const ApprovalRequestSchema = new mongoose.Schema({ companyId: String, module: String, referenceId: String, requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, status: { type: String, default: "pending" }, levels: { type: [mongoose.Schema.Types.Mixed], default: [] } }, { timestamps: true });
module.exports = mongoose.models.ApprovalRequest || mongoose.model("ApprovalRequest", ApprovalRequestSchema);
