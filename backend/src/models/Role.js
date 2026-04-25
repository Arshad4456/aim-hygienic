const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, default: "" },
  erpTemplateKey: { type: String, trim: true, default: "distribution_erp" },
  name: { type: String, required: true, trim: true },
  key: { type: String, trim: true, required: true },
  description: { type: String, trim: true },
  portalType: { type: String, trim: true, default: "company_user" },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  enabledModules: { type: [String], default: [] },
  landingPath: { type: String, trim: true, default: "/portals" },
  mobileAccess: { type: Boolean, default: false },
  mobileModules: { type: [String], default: [] },
  isSystemRole: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdBy: { type: String, trim: true },
  updatedBy: { type: String, trim: true },
}, { timestamps: true });

RoleSchema.index({ companyId: 1, key: 1 }, { unique: true, sparse: true });
RoleSchema.index({ companyId: 1, status: 1, isSystemRole: 1 });
RoleSchema.index({ erpTemplateKey: 1, status: 1 });

module.exports = mongoose.models.Role || mongoose.model("Role", RoleSchema);
