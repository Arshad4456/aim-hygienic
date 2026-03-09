const mongoose = require("mongoose");

const GoodsReceiptItemSchema = new mongoose.Schema(
  {
    productId: { type: String, trim: true },
    productName: { type: String, required: true, trim: true },
    warehouseId: { type: String, required: true, trim: true },
    warehouseName: { type: String, trim: true },
    quantityReceived: { type: Number, required: true, min: 0 },
    acceptedQuantity: { type: Number, default: 0, min: 0 },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date },
  },
  { _id: false }
);

const GoodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: { type: String, required: true, trim: true, unique: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    poNumber: { type: String, required: true, trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    supplierName: { type: String, required: true, trim: true },
    receivedDate: { type: Date, required: true },
    qcStatus: { type: String, enum: ["pending", "passed", "failed"], default: "pending" },
    status: { type: String, enum: ["draft", "posted", "cancelled"], default: "posted" },
    items: { type: [GoodsReceiptItemSchema], default: [] },
    totalReceivedQty: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GoodsReceipt", GoodsReceiptSchema);
