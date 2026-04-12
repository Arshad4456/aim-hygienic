const { Schema } = require("mongoose");

const PartySnapshotSchema = new Schema(
  {
    partyType: { type: String, trim: true },
    partyId: { type: String, trim: true },
    partyCode: { type: String, trim: true },
    partyName: { type: String, trim: true },
    contactName: { type: String, trim: true },
    mobile: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const LineItemSchema = new Schema(
  {
    lineNo: { type: Number, default: 1 },
    productId: { type: String, trim: true },
    productCode: { type: String, trim: true },
    productName: { type: String, trim: true, required: true },
    uom: { type: String, trim: true, default: "pack" },
    qty: { type: Number, default: 0 },
    reservedQty: { type: Number, default: 0 },
    dispatchedQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    deliveredQty: { type: Number, default: 0 },
    returnedQty: { type: Number, default: 0 },
    bonusQty: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    discountValue: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    taxValue: { type: Number, default: 0 },
    netLineAmount: { type: Number, default: 0 },
    batchNo: { type: String, trim: true },
    manufactureDate: Date,
    expiryDate: Date,
    returnDate: Date,
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const TotalsSchema = new Schema(
  {
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    freightTotal: { type: Number, default: 0 },
    otherChargesTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const LedgerPostingSchema = new Schema(
  {
    postingState: {
      type: String,
      enum: ["unposted", "posted", "reversed"],
      default: "unposted",
    },
    postingKey: { type: String, trim: true },
    postedAt: Date,
    reversedAt: Date,
  },
  { _id: false }
);

const StatusHistorySchema = new Schema(
  {
    status: { type: String, trim: true, required: true },
    note: { type: String, trim: true },
    changedBy: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

module.exports = {
  PartySnapshotSchema,
  LineItemSchema,
  TotalsSchema,
  LedgerPostingSchema,
  StatusHistorySchema,
};
