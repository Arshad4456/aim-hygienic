const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, StatusHistorySchema } = require("../../../common/files/models/documentParts");

const PosSaleSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "PosSession", index: true },
    sessionNo: { type: String, trim: true },
    branchId: { type: String, trim: true },
    branchName: { type: String, trim: true },
    warehouseId: { type: String, trim: true, required: true },
    warehouseName: { type: String, trim: true },
    cashierId: { type: String, trim: true, required: true, index: true },
    cashierName: { type: String, trim: true },
    customer: { type: PartySnapshotSchema, default: () => ({ partyType: "walk_in", partyName: "Walk-in Customer" }) },
    saleDate: { type: Date, default: Date.now, index: true },
    lines: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    paymentMethod: { type: String, trim: true, default: "cash" },
    amountPaid: { type: Number, default: 0 },
    changeDue: { type: Number, default: 0 },
    status: { type: String, trim: true, enum: ["draft", "posted", "returned", "void"], default: "posted", index: true },
    receiptPrintedAt: Date,
    returnOfSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "PosSale" },
    returnReason: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PosSaleSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
PosSaleSchema.index({ companyId: 1, saleDate: -1, status: 1 });

module.exports = mongoose.models.PosSale || mongoose.model("PosSale", PosSaleSchema);
