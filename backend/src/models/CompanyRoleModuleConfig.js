const mongoose = require("mongoose");

const CompanyRoleModuleConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    companyRoleConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyRoleConfig",
      required: true,
      index: true,
    },
    companyDashboardConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDashboardConfig",
      required: true,
      index: true,
    },
    moduleTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModuleTemplate",
      required: true,
    },
    moduleCode: { type: String, required: true, trim: true, lowercase: true },
    moduleName: { type: String, required: true, trim: true },
    moduleType: { type: String, trim: true, default: null },
    selectedSubtypes: { type: [String], default: [] },
    selectedSections: { type: [String], default: [] },
    sidebarLabel: { type: String, required: true, trim: true },
    sidebarPath: { type: String, required: true, trim: true },
    sidebarOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanyRoleModuleConfigSchema.index({ companyId: 1, companyRoleConfigId: 1, moduleCode: 1 }, { unique: true });

module.exports = mongoose.model("CompanyRoleModuleConfig", CompanyRoleModuleConfigSchema);