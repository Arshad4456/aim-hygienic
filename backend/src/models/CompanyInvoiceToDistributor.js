const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, LedgerPostingSchema, StatusHistorySchema } = require("./shared/documentParts");

const CompanyInvoiceToDistributorSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "company" },
    ownerId: { type: String, trim: true, required: true },
    distributorId: { type: String, trim: true, required: true, index: true },
    distributor: { type: PartySnapshotSchema, required: true },
    companySalesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanySalesOrder", index: true },
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

CompanyInvoiceToDistributorSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
module.exports = mongoose.models.CompanyInvoiceToDistributor || mongoose.model("CompanyInvoiceToDistributor", CompanyInvoiceToDistributorSchema);
