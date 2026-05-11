const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, LedgerPostingSchema, StatusHistorySchema } = require("../../files/models/documentParts");

const SupplierInvoiceSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  documentNo: { type: String, trim: true, required: true },
  ownerType: { type: String, trim: true, default: "company" },
  ownerId: { type: String, trim: true, required: true },
  supplier: { type: PartySnapshotSchema, required: true },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, index: true },
  purchaseOrderNo: { type: String, trim: true },
  goodsReceiptId: { type: mongoose.Schema.Types.ObjectId, index: true },
  goodsReceiptNo: { type: String, trim: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  status: { type: String, trim: true, default: "draft", enum: ["draft", "posted", "void"] },
  paymentStatus: { type: String, trim: true, default: "unpaid", enum: ["unpaid", "partial", "paid", "overpaid"] },
  invoiceTotal: { type: Number, default: 0 },
  allocatedPaymentTotal: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  lines: { type: [LineItemSchema], default: [] },
  totals: { type: TotalsSchema, default: () => ({}) },
  ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
  statusHistory: { type: [StatusHistorySchema], default: [] },
  createdByUserId: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

SupplierInvoiceSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
SupplierInvoiceSchema.index({ companyId: 1, goodsReceiptId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.SupplierInvoice || mongoose.model("SupplierInvoice", SupplierInvoiceSchema);
