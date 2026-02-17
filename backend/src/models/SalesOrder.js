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

const SalesOrderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "dispatched", "delivered"],
      required: true,
    },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const SalesOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, trim: true },
    saleType: { type: String, enum: ["primary", "secondary"], default: "primary" },
    sourceType: {
      type: String,
      enum: ["brand", "distributor", "order_booker", "customer"],
      default: "customer",
    },
    customerName: { type: String, required: true, trim: true },
    customerType: {
      type: String,
      enum: ["customer", "distributor", "salesman", "brand"],
      default: "customer",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "dispatched", "delivered"],
      default: "pending",
    },
    unreadForAdmin: { type: Boolean, default: true },
    unreadForWarehouse: { type: Boolean, default: true },
    unreadForDistributor: { type: Boolean, default: true },
    unreadForBrandManager: { type: Boolean, default: true },
    unreadForSalesman: { type: Boolean, default: true },
    unreadForOrderBooker: { type: Boolean, default: true },
    unreadForCustomer: { type: Boolean, default: true },
    canRecoverFromRejected: { type: Boolean, default: true },
    orderDate: { type: Date, default: Date.now },
    expectedDelivery: { type: Date },
    dispatchTracking: { type: String, trim: true },
    dispatchVehicleId: { type: String, trim: true },
    dispatchVehicleName: { type: String, trim: true },
    dispatchDriverId: { type: String, trim: true },
    dispatchDriverName: { type: String, trim: true },
    dispatchedAt: { type: Date },
    deliveredAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    receiptAgreement: {
      type: String,
      enum: ["pending", "agreed", "not_agreed"],
      default: "pending",
    },
    receiptAgreementAt: { type: Date },
    receiptAgreementBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    proofOfDeliveryImageUrl: { type: String, trim: true },
    proofOfDeliveryAt: { type: Date },
    proofOfDeliveryBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    brandManagerId: { type: String, trim: true },
    distributorId: { type: String, trim: true },
    orderBookerId: { type: String, trim: true },
    salesmanId: { type: String, trim: true },
    customerId: { type: String, trim: true },
    warehouseManagerId: { type: String, trim: true },
    deliveryBoyId: { type: String, trim: true },
    items: { type: [SalesOrderItemSchema], default: [] },
    statusHistory: { type: [SalesOrderStatusHistorySchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesOrder", SalesOrderSchema);
