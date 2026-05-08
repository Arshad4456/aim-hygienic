const mongoose = require("mongoose");
const { StatusHistorySchema } = require("./shared/documentParts");

const PosSessionSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    sessionNo: { type: String, trim: true, required: true },
    branchId: { type: String, trim: true },
    branchName: { type: String, trim: true },
    warehouseId: { type: String, trim: true, required: true },
    warehouseName: { type: String, trim: true },
    cashRegisterId: { type: String, trim: true },
    cashRegisterName: { type: String, trim: true },
    cashierId: { type: String, trim: true, required: true, index: true },
    cashierName: { type: String, trim: true },
    openingCash: { type: Number, default: 0 },
    closingCash: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    cashDifference: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalReturns: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    paymentBreakdown: {
      cash: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      bank: { type: Number, default: 0 },
      wallet: { type: Number, default: 0 },
      credit: { type: Number, default: 0 },
    },
    status: { type: String, trim: true, enum: ["open", "closed", "void"], default: "open", index: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
    notes: { type: String, trim: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
  },
  { timestamps: true }
);

PosSessionSchema.index({ companyId: 1, sessionNo: 1 }, { unique: true });
PosSessionSchema.index({ companyId: 1, status: 1, openedAt: -1 });

module.exports = mongoose.models.PosSession || mongoose.model("PosSession", PosSessionSchema);
