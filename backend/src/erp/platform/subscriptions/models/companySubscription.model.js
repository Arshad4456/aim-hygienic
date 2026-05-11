const mongoose = require("mongoose");

const CompanySubscriptionSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, trim: true, index: true },
    planKey: { type: String, required: true, trim: true, default: "starter" },
    status: { type: String, enum: ["trial", "active", "expired", "suspended", "cancelled"], default: "active", index: true },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    userLimit: { type: Number, default: 25 },
    branchLimit: { type: Number, default: 1 },
    warehouseLimit: { type: Number, default: 1 },
    moduleLimit: { type: Number, default: 10 },
    mobileUserLimit: { type: Number, default: 5 },
    allowedModules: { type: [String], default: [] },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanySubscriptionSchema.index({ companyId: 1, planKey: 1 });
module.exports = mongoose.models.CompanySubscription || mongoose.model("CompanySubscription", CompanySubscriptionSchema);
