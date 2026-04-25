const mongoose = require("mongoose");

const SupplierSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  supplierCode: { type: String, trim: true },
  supplierName: { type: String, trim: true, required: true },
  contactName: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  taxNo: { type: String, trim: true },
  paymentTermsDays: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  linkedUserId: { type: String, trim: true },
  status: { type: String, enum: ["active", "inactive", "blocked"], default: "active" },
  notes: { type: String, trim: true },
  createdByUserId: { type: String, trim: true },
}, { timestamps: true });

SupplierSchema.index({ companyId: 1, supplierCode: 1 }, { unique: true, sparse: true });
SupplierSchema.index({ companyId: 1, supplierName: 1 });

module.exports = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
