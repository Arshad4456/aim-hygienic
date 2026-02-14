const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    productId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    alternativeName: { type: String, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    category: { type: String, trim: true },
    subCategory: { type: String, trim: true },
    size: { type: String, trim: true },
    unit: { type: String, trim: true },
    weight: { type: Number, default: 0 },
    weightUnitName: { type: String, trim: true },
    cartonSize: { type: Number, default: 0 },
    packSize: { type: Number, default: 0 },
    retailPrice: { type: Number, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    tradePrice: { type: Number, default: 0 },
    taxablePrice: { type: Number, default: 0 },
    customerPrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    discountPer: { type: Number, default: 0 },
    unitScheme: { type: Number, default: 0 },
    isTaxFromCustomer: { type: Boolean, default: false },
    isTaxAppliedOnBonus: { type: Boolean, default: false },
    isTaxAppliedAfterDiscountAndScheme: { type: Boolean, default: false },
    isDiscountAppliedAfterScheme: { type: Boolean, default: false },
    taxPer: { type: Number, default: 0 },
    fedPer: { type: Number, default: 0 },
    taxTypeName: { type: String, trim: true },
    activationType: { type: String, trim: true },
    barcode: { type: String, trim: true },
    bulkBarcode: { type: String, trim: true },
    sku: { type: String, trim: true },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
