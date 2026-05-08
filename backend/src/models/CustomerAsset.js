const mongoose = require("mongoose");
const CustomerAssetSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  assetNo: { type: String, trim: true, required: true },
  customerId: { type: String, trim: true, index: true },
  customerName: { type: String, trim: true, required: true },
  assetName: { type: String, trim: true, required: true },
  serialNo: { type: String, trim: true },
  modelNo: { type: String, trim: true },
  installationDate: Date,
  warrantyUntil: Date,
  location: { type: String, trim: true },
  status: { type: String, enum: ["active", "inactive", "under_service", "retired"], default: "active", index: true },
  notes: { type: String, trim: true },
}, { timestamps: true });
CustomerAssetSchema.index({ companyId: 1, assetNo: 1 }, { unique: true });
module.exports = mongoose.models.CustomerAsset || mongoose.model("CustomerAsset", CustomerAssetSchema);
