const mongoose = require("mongoose");

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"];

const ChartAccountSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, index: true, required: true },
    code: { type: String, trim: true, required: true },
    name: { type: String, trim: true, required: true },
    type: { type: String, enum: ACCOUNT_TYPES, required: true, index: true },
    parentCode: { type: String, trim: true },
    normalBalance: { type: String, enum: ["debit", "credit"], required: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    isSystem: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

ChartAccountSchema.index({ companyId: 1, code: 1 }, { unique: true });
ChartAccountSchema.index({ companyId: 1, type: 1, status: 1 });

module.exports = mongoose.models.ChartAccount || mongoose.model("ChartAccount", ChartAccountSchema);
