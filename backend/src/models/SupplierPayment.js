const mongoose = require("mongoose");
const { PartySnapshotSchema, LedgerPostingSchema, StatusHistorySchema } = require("./shared/documentParts");

const SupplierPaymentSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },

    ownerType: { type: String, trim: true, default: "company" },
    ownerId: { type: String, trim: true, required: true },

    supplier: { type: PartySnapshotSchema, required: true },
    paymentDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, trim: true },
    fromAccountId: { type: String, trim: true },

    status: { type: String, trim: true, default: "pending", enum: ["pending", "approved", "posted", "rejected", "void"] },
    allocations: [
      {
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "SupplierInvoice" },
        invoiceNo: { type: String, trim: true },
        allocatedAmount: { type: Number, default: 0 },
      },
    ],

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

SupplierPaymentSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });

module.exports = mongoose.models.SupplierPayment || mongoose.model("SupplierPayment", SupplierPaymentSchema);