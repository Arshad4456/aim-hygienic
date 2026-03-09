const mongoose = require("mongoose");

const ProcurementSupplierSchema = new mongoose.Schema(
  {
    supplierCode: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    taxId: { type: String, trim: true },
    address: { type: String, trim: true },
    paymentTerms: { type: String, trim: true, default: "Net 30" },
    leadTimeDays: { type: Number, default: 7 },
    rating: { type: Number, min: 1, max: 5, default: 3 },
    status: { type: String, enum: ["active", "inactive", "blocked"], default: "active" },
    lastOrderAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProcurementSupplier", ProcurementSupplierSchema);
