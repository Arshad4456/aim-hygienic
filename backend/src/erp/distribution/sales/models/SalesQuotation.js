const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, TotalsSchema, StatusHistorySchema } = require("../../../common/files/models/documentParts");

const SalesQuotationSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    companyName: { type: String, trim: true },
    documentNo: { type: String, trim: true, required: true },
    quotationType: { type: String, trim: true, enum: ["primary", "secondary"], default: "primary", index: true },
    distributorId: { type: String, trim: true, index: true },
    customerId: { type: String, trim: true, index: true },
    party: { type: PartySnapshotSchema, required: true },
    validUntil: Date,
    status: {
      type: String,
      trim: true,
      enum: ["draft", "sent", "approved", "rejected", "converted", "cancelled"],
      default: "draft",
      index: true,
    },
    lines: { type: [LineItemSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    convertedOrderId: { type: mongoose.Schema.Types.ObjectId },
    convertedOrderNo: { type: String, trim: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    approvedByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

SalesQuotationSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
SalesQuotationSchema.index({ companyId: 1, quotationType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.SalesQuotation || mongoose.model("SalesQuotation", SalesQuotationSchema);
