const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, LedgerPostingSchema, StatusHistorySchema } = require("../../files/models/documentParts");

const ReturnDocumentSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, required: true, enum: ["company", "distributor"] },
    ownerId: { type: String, trim: true, required: true },
    distributorId: { type: String, trim: true, index: true },
    returnType: { type: String, trim: true, required: true, enum: ["purchase_return", "distributor_return_to_company", "customer_return"] },
    sourceDocumentType: { type: String, trim: true },
    sourceDocumentId: { type: mongoose.Schema.Types.ObjectId },
    fromParty: PartySnapshotSchema,
    toParty: PartySnapshotSchema,
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    status: { type: String, trim: true, default: "draft", enum: ["draft", "approved", "posted", "rejected", "reversed"] },
    reasonCode: { type: String, trim: true },
    lines: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    approvedByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

ReturnDocumentSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
module.exports = mongoose.models.ReturnDocument || mongoose.model("ReturnDocument", ReturnDocumentSchema);
