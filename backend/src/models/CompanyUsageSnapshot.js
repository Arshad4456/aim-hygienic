const mongoose = require("mongoose");

const CompanyUsageSnapshotSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    snapshotDate: { type: Date, required: true, index: true },
    userCount: { type: Number, default: 0 },
    activeUserCount: { type: Number, default: 0 },
    warehouseCount: { type: Number, default: 0 },
    vehicleCount: { type: Number, default: 0 },
    activeRoleCount: { type: Number, default: 0 },
    activeDashboardCount: { type: Number, default: 0 },
    assignedModuleCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    receiptCount: { type: Number, default: 0 },
    paymentCount: { type: Number, default: 0 },
    expenseCount: { type: Number, default: 0 },
    loanCount: { type: Number, default: 0 },
    storageUsageBytes: { type: Number, default: 0 },
    documentTemplateCount: { type: Number, default: 0 },
    onboardingCompleted: { type: Boolean, default: false },
    lifecycleStatus: { type: String, default: "inactive" },
    subscriptionStatus: { type: String, default: "pending" },
    planCode: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

CompanyUsageSnapshotSchema.index({ companyId: 1, snapshotDate: -1 });

module.exports = mongoose.model("CompanyUsageSnapshot", CompanyUsageSnapshotSchema);