const mongoose = require("mongoose");
const LandedCostSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  costNo: { type: String, trim: true, required: true },
  shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "TradingShipment", index: true },
  shipmentNo: { type: String, trim: true },
  freight: { type: Number, default: 0 }, customsDuty: { type: Number, default: 0 }, clearing: { type: Number, default: 0 }, insurance: { type: Number, default: 0 }, otherCharges: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 }, allocationMethod: { type: String, enum: ["value", "quantity"], default: "value" },
  status: { type: String, enum: ["draft", "posted", "cancelled"], default: "posted", index: true },
  notes: { type: String, trim: true },
}, { timestamps: true });
LandedCostSchema.index({ companyId: 1, costNo: 1 }, { unique: true });
module.exports = mongoose.models.LandedCost || mongoose.model("LandedCost", LandedCostSchema);
