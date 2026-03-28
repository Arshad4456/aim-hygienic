const mongoose = require("mongoose");

const WarehouseTransactionItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    cartonSize: { type: String, trim: true, default: "" },
    cartonCount: { type: Number, default: 0 },
    packsPerCarton: { type: Number, default: 0 },
    cartons: { type: Number, default: 0 },
    packs: { type: Number, default: 0 },
    totalPacks: { type: Number, required: true },
    onePackPrice: { type: Number, default: 0 },
    oneCartonPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    manufactureDate: { type: Date },
    expiryDate: { type: Date },
    returnDate: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const WarehouseTransactionSchema = new mongoose.Schema(
  {
    transactionCode: { type: String, required: true, trim: true, unique: true },
    transactionType: {
      type: String,
      required: true,
      enum: [
        "PURCHASING_STOCK",
        "SALE_STOCK",
        "DAMAGE_STOCK",
        "RETURN_STOCK",
        "RETURN_TO_SD",
        "STOCK_IN",
        "STOCK_OUT",
        "PURCHASING_OUT",
        "MOVEMENT",
      ],
    },
    transactionAt: { type: Date, default: Date.now },
    fromEntityType: { type: String, trim: true },
    fromEntityName: { type: String, trim: true },
    toEntityType: { type: String, trim: true },
    toEntityName: { type: String, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    regionId: { type: String, trim: true },
    regionName: { type: String, trim: true },
    zoneId: { type: String, trim: true },
    zoneName: { type: String, trim: true },
    territory: { type: String, trim: true },
    fieldId: { type: String, trim: true },
    fieldName: { type: String, trim: true },
    brandId: { type: String, trim: true },
    brandName: { type: String, trim: true },
    distributorId: { type: String, trim: true },
    distributorName: { type: String, trim: true },
    subDistributorId: { type: String, trim: true },
    subDistributorName: { type: String, trim: true },
    note: { type: String, trim: true },
    paymentDueDate: { type: Date },
    returnPaymentStatus: {
      type: String,
      enum: ["NOT_APPLICABLE", "PENDING", "PAID", "OVERDUE"],
      default: "NOT_APPLICABLE",
    },
    requestStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "DISPATCHED", "DELIVERED"], default: "APPROVED" },
    requestSourceRole: { type: String, trim: true },
    requestReadAt: { type: Date },
    requestReviewedAt: { type: Date },
    requestReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requestApplied: { type: Boolean, default: false },
    subtotal: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    extraDiscPer: { type: Number, default: 0 },
    advTaxPer: { type: Number, default: 0 },
    whTaxPer: { type: Number, default: 0 },
    expense: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    items: { type: [WarehouseTransactionItemSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

WarehouseTransactionSchema.index({ transactionType: 1, transactionAt: -1 });

module.exports = mongoose.model("WarehouseTransaction", WarehouseTransactionSchema);
