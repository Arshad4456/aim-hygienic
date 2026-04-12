const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, LedgerPostingSchema, StatusHistorySchema } = require("./shared/documentParts");

const CustomerInvoiceSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "distributor" },
    ownerId: { type: String, trim: true, required: true, index: true },
    distributorId: { type: String, trim: true, required: true, index: true },
    customer: { type: PartySnapshotSchema, required: true },
    secondaryOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "SecondaryOrder", index: true },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: Date,
    status: { type: String, trim: true, default: "draft", enum: ["draft", "posted", "void"] },
    paymentStatus: { type: String, trim: true, default: "unpaid", enum: ["unpaid", "partial", "paid", "overpaid"] },
    invoiceTotal: { type: Number, default: 0 },
    allocatedReceiptTotal: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    lines: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

CustomerInvoiceSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
CustomerInvoiceSchema.index({ companyId: 1, distributorId: 1, paymentStatus: 1, dueDate: 1 });

module.exports = mongoose.models.CustomerInvoice || mongoose.model("CustomerInvoice", CustomerInvoiceSchema);
