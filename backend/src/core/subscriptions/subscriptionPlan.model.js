const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    monthlyPrice: { type: Number, default: 0 },
    userLimit: { type: Number, default: 25 },
    branchLimit: { type: Number, default: 1 },
    warehouseLimit: { type: Number, default: 1 },
    moduleLimit: { type: Number, default: 10 },
    mobileUserLimit: { type: Number, default: 5 },
    allowedModules: { type: [String], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SubscriptionPlan || mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
