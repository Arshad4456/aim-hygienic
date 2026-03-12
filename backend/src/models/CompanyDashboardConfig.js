const mongoose = require("mongoose");

const sharedFeatureSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    isEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const CompanyDashboardConfigSchema = new mongoose.Schema(
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
    roleCode: { type: String, required: true, trim: true, lowercase: true },
    roleName: { type: String, required: true, trim: true },
    dashboardTitle: { type: String, required: true, trim: true },
    dashboardCode: { type: String, required: true, trim: true, lowercase: true },
    shellConfig: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {
        hasHeader: true,
        hasSidebar: true,
        hasNotifications: true,
        hasProfileMenu: true,
        hasSettingsShortcut: true,
      },
    },
    sidebarItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sharedFeatures: { type: [sharedFeatureSchema], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanyDashboardConfigSchema.index({ companyId: 1, roleCode: 1 }, { unique: true });

module.exports = mongoose.model("CompanyDashboardConfig", CompanyDashboardConfigSchema);