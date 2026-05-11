const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, StatusHistorySchema } = require("../../files/models/documentParts");

const PurchaseRequestSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    requester: PartySnapshotSchema,
    department: { type: String, trim: true },
    requiredDate: Date,
    targetWarehouse: PartySnapshotSchema,
    status: {
      type: String,
      trim: true,
      enum: ["draft", "submitted", "approved", "rejected", "converted", "cancelled"],
      default: "submitted",
      index: true,
    },
    lines: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    convertedPurchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    convertedPurchaseOrderNo: { type: String, trim: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    approvedByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PurchaseRequestSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
PurchaseRequestSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.PurchaseRequest || mongoose.model("PurchaseRequest", PurchaseRequestSchema);
