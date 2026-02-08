const mongoose = require("mongoose");

const SalesOrderItemSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    productCode: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SalesOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerType: {
      type: String,
      enum: ["customer", "distributor", "salesman"],
      default: "customer",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "dispatched", "completed", "cancelled"],
      default: "pending",
    },
    orderDate: { type: Date, default: Date.now },
    expectedDelivery: { type: Date },
    items: { type: [SalesOrderItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesOrder", SalesOrderSchema);
