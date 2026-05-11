const mongoose = require("mongoose");
const RoleSchema = new mongoose.Schema({
  companyId: { type: String, trim: true },
  name: { type: String, required: true, trim: true },
  key: { type: String, trim: true },
  description: { type: String, trim: true },
  portalType: { type: String, trim: true },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  mobileAccess: { type: Boolean, default: false },
  isSystemRole: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });
RoleSchema.index({ companyId: 1, key: 1 }, { unique: true, sparse: true });
module.exports = mongoose.models.Role || mongoose.model("Role", RoleSchema);
