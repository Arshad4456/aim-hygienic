const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    category: { type: String, trim: true },
    subCategory: { type: String, trim: true },
    size: { type: String, trim: true },
    unit: { type: String, trim: true },
    initialPrice: { type: Number, default: 0 },
    customerPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    minStockLevel: { type: Number, default: 0 },
    barcode: { type: String, trim: true },
    sku: { type: String, trim: true },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
