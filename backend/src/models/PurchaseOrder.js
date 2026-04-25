const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, StatusHistorySchema } = require("./shared/documentParts");

const PurchaseOrderSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  documentNo: { type: String, trim: true, required: true },
  supplier: { type: PartySnapshotSchema, required: true },
  expectedDate: Date,
  orderDate: { type: Date, default: Date.now },
  warehouse: PartySnapshotSchema,
  status: { type: String, enum: ["draft", "pending_approval", "approved", "partially_received", "received", "cancelled", "closed"], default: "draft", index: true },
  lines: { type: [LineItemSchema], default: [] },
  totals: { type: TotalsSchema, default: () => ({}) },
  receivedTotal: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  statusHistory: { type: [StatusHistorySchema], default: [] },
  createdByUserId: { type: String, trim: true },
  approvedByUserId: { type: String, trim: true },
  approvedAt: Date,
  notes: { type: String, trim: true },
}, { timestamps: true });

PurchaseOrderSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
PurchaseOrderSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", PurchaseOrderSchema);
