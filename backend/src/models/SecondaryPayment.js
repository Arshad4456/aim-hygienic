const mongoose = require("mongoose");

const SecondaryPaymentSchema = new mongoose.Schema(
  {
    primaryPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrimaryPayment",
      required: true,
      index: true,
    },
    primaryInvoiceNo: { type: String, required: true, index: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    distributorName: { type: String, required: true, trim: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
    warehouseName: { type: String, required: true, trim: true },
    amountPaid: { type: Number, required: true, min: 0 },
    paidDate: { type: Date, required: true },
    details: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SecondaryPayment", SecondaryPaymentSchema);
