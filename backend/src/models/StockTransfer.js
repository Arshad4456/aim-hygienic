const mongoose = require("mongoose");

const StockTransferSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    fromWarehouseId: { type: String, required: true, trim: true },
    fromWarehouseName: { type: String, trim: true },
    toWarehouseId: { type: String, required: true, trim: true },
    toWarehouseName: { type: String, trim: true },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ["pending", "in-transit", "completed"], default: "pending" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockTransfer", StockTransferSchema);
