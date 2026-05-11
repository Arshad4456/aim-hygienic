const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, LedgerPostingSchema, StatusHistorySchema } = require("../../files/models/documentParts");

const GoodsReceiptSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    companyName: { type: String, trim: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "company" },
    ownerId: { type: String, trim: true, required: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId },
    purchaseOrderNo: { type: String, trim: true },
    supplier: PartySnapshotSchema,
    receivedAtWarehouse: PartySnapshotSchema,
    transporter: PartySnapshotSchema,
    podUrl: { type: String, trim: true },
    status: { type: String, trim: true, default: "draft", enum: ["draft", "posted", "reversed"] },
    receivedAt: Date,
    lines: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

GoodsReceiptSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
module.exports = mongoose.models.GoodsReceipt || mongoose.model("GoodsReceipt", GoodsReceiptSchema);
