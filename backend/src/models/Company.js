const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      required: true,
    },
    logoUrl: { type: String, trim: true, default: "" },
    primaryColor: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },

    // legacy compatibility fields
    companyId: { type: String, trim: true, unique: true, sparse: true },
    phone1: { type: String, trim: true, default: "" },
    phone2: { type: String, trim: true, default: "" },
    mainOfficeAddress: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    activeHierarchyConfigId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyHierarchyConfig", default: null },
    activeHierarchyCode: { type: String, trim: true, default: null },
    activeRoleCodes: { type: [String], default: [] },
    hasRoleConfiguration: { type: Boolean, default: false },
    hasDashboardConfiguration: { type: Boolean, default: false },
    onboardingStatus: { type: String, enum: ["not_started", "in_progress", "completed"], default: "not_started" },
    lifecycleStatus: { type: String, enum: ["active", "trial", "suspended", "expired", "inactive"], default: "active" },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
    activatedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    setupCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", CompanySchema);