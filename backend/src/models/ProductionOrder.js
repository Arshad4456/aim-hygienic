const mongoose = require("mongoose");
const { LineItemSchema, TotalsSchema, StatusHistorySchema } = require("./shared/documentParts");

const ProductionOrderSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    bomId: { type: mongoose.Schema.Types.ObjectId, ref: "BillOfMaterial" },
    bomNo: { type: String, trim: true },
    finishedProductId: { type: String, trim: true, required: true, index: true },
    finishedProductCode: { type: String, trim: true },
    finishedProductName: { type: String, trim: true, required: true },
    plannedQty: { type: Number, required: true },
    producedQty: { type: Number, default: 0 },
    rejectedQty: { type: Number, default: 0 },
    scrapQty: { type: Number, default: 0 },
    uom: { type: String, trim: true, default: "unit" },
    rawMaterialWarehouseId: { type: String, trim: true, required: true },
    rawMaterialWarehouseName: { type: String, trim: true },
    finishedGoodsWarehouseId: { type: String, trim: true, required: true },
    finishedGoodsWarehouseName: { type: String, trim: true },
    startDate: Date,
    dueDate: Date,
    completedAt: Date,
    materials: { type: [LineItemSchema], default: [] },
    issuedAt: Date,
    issuedByUserId: { type: String, trim: true },
    receivedAt: Date,
    receivedByUserId: { type: String, trim: true },
    totals: { type: TotalsSchema, default: () => ({}) },
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    status: {
      type: String,
      trim: true,
      enum: ["draft", "planned", "materials_issued", "in_production", "quality_check", "completed", "cancelled"],
      default: "planned",
      index: true,
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

ProductionOrderSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });
ProductionOrderSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.ProductionOrder || mongoose.model("ProductionOrder", ProductionOrderSchema);
