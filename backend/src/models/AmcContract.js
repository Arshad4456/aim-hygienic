const mongoose = require("mongoose");
const AmcContractSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  contractNo: { type: String, trim: true, required: true },
  customerId: { type: String, trim: true, index: true },
  customerName: { type: String, trim: true, required: true },
  assetId: { type: String, trim: true },
  assetName: { type: String, trim: true },
  startDate: Date,
  endDate: Date,
  visitFrequency: { type: String, trim: true, default: "monthly" },
  contractValue: { type: Number, default: 0 },
  billingCycle: { type: String, trim: true, default: "monthly" },
  status: { type: String, enum: ["draft", "active", "expired", "cancelled"], default: "active", index: true },
  notes: { type: String, trim: true },
}, { timestamps: true });
AmcContractSchema.index({ companyId: 1, contractNo: 1 }, { unique: true });
module.exports = mongoose.models.AmcContract || mongoose.model("AmcContract", AmcContractSchema);
