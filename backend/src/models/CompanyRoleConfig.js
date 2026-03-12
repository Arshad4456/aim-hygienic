const mongoose = require("mongoose");

const CompanyRoleConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    roleTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoleTemplate",
      required: true,
    },
    roleCode: { type: String, required: true, trim: true, lowercase: true },
    roleName: { type: String, required: true, trim: true },
    hierarchyCode: { type: String, required: true, trim: true, lowercase: true },
    isMandatory: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanyRoleConfigSchema.index({ companyId: 1, roleCode: 1 }, { unique: true });

module.exports = mongoose.model("CompanyRoleConfig", CompanyRoleConfigSchema);