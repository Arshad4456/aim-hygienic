const mongoose = require("mongoose");
const { PartySnapshotSchema, LineItemSchema, LedgerPostingSchema, StatusHistorySchema } = require("./shared/documentParts");

const CompanyDispatchNoteSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, trim: true, default: "company" },
    ownerId: { type: String, trim: true, required: true },
    companySalesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanySalesOrder", required: true, index: true },
    distributorId: { type: String, trim: true, required: true, index: true },
    dispatchFromWarehouse: PartySnapshotSchema,
    transporter: PartySnapshotSchema,
    vehicleId: { type: String, trim: true },
    driverUserId: { type: String, trim: true },
    podUrl: { type: String, trim: true },
    status: { type: String, trim: true, default: "draft", enum: ["draft", "posted", "delivered", "reversed"] },
    dispatchedAt: Date,
    lines: { type: [LineItemSchema], default: [] },
    ledgerPosting: { type: LedgerPostingSchema, default: () => ({}) },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

CompanyDispatchNoteSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });

module.exports = mongoose.models.CompanyDispatchNote || mongoose.model("CompanyDispatchNote", CompanyDispatchNoteSchema);
