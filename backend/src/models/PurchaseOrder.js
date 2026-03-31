const mongoose = require("mongoose");

const PurchaseOrderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, trim: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    supplierName: { type: String, required: true, trim: true },
    orderDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date },
    currency: { type: String, trim: true, default: "PKR" },
    status: {
      type: String,
      enum: ["draft", "approved", "partially_received", "received", "cancelled"],
      default: "approved",
    },
    items: { type: [PurchaseOrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);
