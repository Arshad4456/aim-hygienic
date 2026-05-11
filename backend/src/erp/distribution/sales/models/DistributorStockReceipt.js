const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, LedgerPostingSchema, StatusHistorySchema } = require("../../../common/files/models/documentParts");

const DistributorStockReceiptSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "distributor" },
    ownerId: { type: String, trim: true, required: true, index: true },
    distributorId: { type: String, trim: true, required: true, index: true },
    sourceDispatchId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyDispatchNote", required: true, index: true },
    receivedAtWarehouse: PartySnapshotSchema,
    podUrl: { type: String, trim: true },
    status: { type: String, trim: true, default: "draft", enum: ["draft", "posted", "reversed"] },
    receivedAt: Date,
    lines: { type: [LineItemSchema], default: [] },
    ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

DistributorStockReceiptSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });

module.exports = mongoose.models.DistributorStockReceipt || mongoose.model("DistributorStockReceipt", DistributorStockReceiptSchema);
