const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, LedgerPostingSchema, StatusHistorySchema } = require("./shared/documentParts");

const SecondaryOrderSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    companyName: { type: String, trim: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "distributor" },
    ownerId: { type: String, trim: true, required: true, index: true },
    distributorId: { type: String, trim: true, required: true, index: true },
    sourceType: { type: String, trim: true, enum: ["customer", "order_booker", "salesman"], default: "customer" },
    customer: { type: PartySnapshotSchema, required: true },
    orderBookerUserId: { type: String, trim: true },
    salesmanUserId: { type: String, trim: true },
    territoryId: { type: String, trim: true, index: true },
    fieldId: { type: String, trim: true, index: true },
    status: { type: String, trim: true, default: "draft", enum: ["draft", "submitted", "approved", "rejected", "reserved", "dispatched", "delivered", "invoiced", "closed", "cancelled"] },
    financialStatus: { type: String, trim: true, default: "not_invoiced", enum: ["not_invoiced", "unpaid", "partial", "paid", "overpaid"] },
    dispatchStatus: { type: String, trim: true, default: "not_dispatched", enum: ["not_dispatched", "partial", "dispatched", "delivered"] },
    lines: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    podUrl: { type: String, trim: true },
    podUploadedBy: { type: String, trim: true },
    podUploadedAt: Date,
    createdByUserId: { type: String, trim: true },
    approvedByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

SecondaryOrderSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
SecondaryOrderSchema.index({ companyId: 1, distributorId: 1, status: 1, createdAt: -1 });
SecondaryOrderSchema.index({ companyId: 1, salesmanUserId: 1, dispatchStatus: 1 });

module.exports = mongoose.models.SecondaryOrder || mongoose.model("SecondaryOrder", SecondaryOrderSchema);
