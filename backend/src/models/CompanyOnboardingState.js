const mongoose = require("mongoose");

const onboardingStepsSchema = new mongoose.Schema(
  {
    companyCreated: { type: Boolean, default: true },
    settingsConfigured: { type: Boolean, default: false },
    hierarchyAssigned: { type: Boolean, default: false },
    rolesAssigned: { type: Boolean, default: false },
    dashboardsGenerated: { type: Boolean, default: false },
    modulesAssigned: { type: Boolean, default: false },
    permissionsConfigured: { type: Boolean, default: false },
    documentTemplatesConfigured: { type: Boolean, default: false },
    setupCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const CompanyOnboardingStateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    currentStep: { type: Number, default: 1, min: 1, max: 9 },
    steps: { type: onboardingStepsSchema, required: true, default: () => ({ companyCreated: true }) },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyOnboardingState", CompanyOnboardingStateSchema);
