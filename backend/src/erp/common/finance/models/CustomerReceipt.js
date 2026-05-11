const mongoose = require("mongoose");
const { PartySnapshotSchema, LedgerPostingSchema, StatusHistorySchema } = require("../../files/models/documentParts");

const CustomerReceiptSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "distributor" },
    ownerId: { type: String, trim: true, required: true, index: true },
    distributorId: { type: String, trim: true, required: true, index: true },
    customer: { type: PartySnapshotSchema, required: true },
    paymentDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, trim: true },
    toAccountId: { type: String, trim: true },
    status: { type: String, trim: true, default: "pending", enum: ["pending", "approved", "posted", "rejected", "void"] },
    allocations: [{
      invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerInvoice" },
      invoiceNo: { type: String, trim: true },
      allocatedAmount: { type: Number, default: 0 },
    }],
    attachmentUrl: { type: String, trim: true },
    referenceNo: { type: String, trim: true },
    ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    approvedByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

CustomerReceiptSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
CustomerReceiptSchema.index({ companyId: 1, distributorId: 1, status: 1, paymentDate: -1 });

module.exports = mongoose.models.CustomerReceipt || mongoose.model("CustomerReceipt", CustomerReceiptSchema);
