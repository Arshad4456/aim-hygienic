const mongoose = require("mongoose");

const PrimaryPaymentSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, index: true },
    regionId: { type: String, required: true, trim: true },
    regionName: { type: String, required: true, trim: true },
    zoneId: { type: String, required: true, trim: true },
    zoneName: { type: String, required: true, trim: true },
    territoryId: { type: String, required: true, trim: true },
    territoryName: { type: String, required: true, trim: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    distributorName: { type: String, required: true, trim: true },
    distributorAddress: { type: String, trim: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
    warehouseName: { type: String, required: true, trim: true },
    amountTotal: { type: Number, required: true, min: 0 },
    payDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    details: { type: String, trim: true },
    amountPaidBack: { type: Number, required: true, default: 0, min: 0 },
    amountRemaining: { type: Number, required: true, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrimaryPayment", PrimaryPaymentSchema);
