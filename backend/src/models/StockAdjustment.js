const mongoose = require("mongoose");

const StockAdjustmentSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    ownerType: { type: String, enum: ["company", "distributor"], default: "company", index: true },
    ownerId: { type: String, trim: true, required: true, index: true },
    distributorId: { type: String, trim: true, index: true },
    warehouseId: { type: String, trim: true, index: true },
    warehouseName: { type: String, trim: true },
    productId: { type: String, trim: true, required: true, index: true },
    productCode: { type: String, trim: true },
    productName: { type: String, trim: true, required: true },
    batchNo: { type: String, trim: true, index: true },
    adjustmentType: { type: String, enum: ["adjustment_in", "adjustment_out", "damage_out", "expiry_out"], required: true },
    qty: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    reason: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    status: { type: String, enum: ["draft", "posted", "reversed"], default: "posted", index: true },
    postedAt: Date,
    postedByUserId: { type: String, trim: true },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

StockAdjustmentSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
StockAdjustmentSchema.index({ companyId: 1, warehouseId: 1, productId: 1, createdAt: -1 });

module.exports = mongoose.models.StockAdjustment || mongoose.model("StockAdjustment", StockAdjustmentSchema);
