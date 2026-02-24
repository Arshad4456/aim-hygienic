const mongoose = require("mongoose");

const ReceiptSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true, unique: true, trim: true, index: true },
    receiptType: { type: String, enum: ["invoice_payment", "advance_payment", "general_deposit"], default: "invoice_payment" },
    payerRole: { type: String, required: true, trim: true, index: true },
    payerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    payerName: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["online", "cash"], required: true, index: true },
    paidToAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    receivedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receivedByName: { type: String, trim: true },
    paymentDate: { type: Date, required: true, index: true },
    referenceNo: { type: String, trim: true },
    linkedInvoiceNo: { type: String, trim: true, index: true },
    linkedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" },
    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    rejectionReason: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    accountTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "AccountTransaction" },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", ReceiptSchema);
