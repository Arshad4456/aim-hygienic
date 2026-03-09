const mongoose = require("mongoose");

const SupplierPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, required: true, trim: true, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    supplierName: { type: String, required: true, trim: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    poNumber: { type: String, trim: true },
    grnNumber: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, default: "PKR" },
    method: { type: String, enum: ["bank_transfer", "cash", "cheque", "mobile_banking"], default: "bank_transfer" },
    status: { type: String, enum: ["pending", "partial", "paid", "overdue"], default: "pending" },
    dueDate: { type: Date },
    paidDate: { type: Date },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupplierPayment", SupplierPaymentSchema);
