const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, trim: true, default: "" },
    billingType: { type: String, enum: ["monthly", "yearly", "custom"], required: true },
    monthlyPrice: { type: Number, default: 0 },
    yearlyPrice: { type: Number, default: 0 },
    maxUsers: { type: Number, default: 0 },
    maxWarehouses: { type: Number, default: 0 },
    maxVehicles: { type: Number, default: 0 },
    includedModules: { type: [String], default: [] },
    includedFeatures: { type: [String], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", PlanSchema);