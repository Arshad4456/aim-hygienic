const mongoose = require("mongoose");
const {
  PartySnapshotSchema,
  LineItemSchema,
  TotalsSchema,
  LedgerPostingSchema,
  StatusHistorySchema,
} = require("./shared/documentParts");

const CompanySalesOrderSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    companyName: { type: String, trim: true },

    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "company" },
    ownerId: { type: String, trim: true, required: true },

    distributorId: { type: String, trim: true, required: true, index: true },
    distributor: { type: PartySnapshotSchema, required: true },

    sourceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "DistributorSupplyRequest" },
    dispatchFromWarehouse: PartySnapshotSchema,
    receiveAtWarehouse: PartySnapshotSchema,

    freightPayer: { type: String, trim: true, enum: ["company", "distributor", "split"], default: "company" },
    deliveryMode: { type: String, trim: true, enum: ["company_truck", "distributor_pickup", "transporter"], default: "company_truck" },

    status: {
      type: String,
      trim: true,
      default: "draft",
      enum: ["draft", "approved", "reserved", "ready_to_dispatch", "dispatched", "received", "invoiced", "closed", "cancelled"],
    },
    financialStatus: {
      type: String,
      trim: true,
      default: "not_invoiced",
      enum: ["not_invoiced", "unpaid", "partial", "paid", "overpaid"],
    },

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

CompanySalesOrderSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
CompanySalesOrderSchema.index({ companyId: 1, distributorId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.CompanySalesOrder || mongoose.model("CompanySalesOrder", CompanySalesOrderSchema);