const mongoose = require("mongoose");
const { LineItemSchema, StatusHistorySchema } = require("../../../common/files/models/documentParts");

const BillOfMaterialSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    bomNo: { type: String, trim: true, required: true },
    finishedProductId: { type: String, trim: true, required: true, index: true },
    finishedProductCode: { type: String, trim: true },
    finishedProductName: { type: String, trim: true, required: true },
    outputQty: { type: Number, default: 1 },
    uom: { type: String, trim: true, default: "unit" },
    version: { type: String, trim: true, default: "1.0" },
    routingSteps: [{ stepNo: Number, name: String, workCenter: String, estimatedMinutes: Number, notes: String }],
    materials: { type: [LineItemSchema], default: [] },
    overheadCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    estimatedUnitCost: { type: Number, default: 0 },
    status: { type: String, trim: true, enum: ["draft", "active", "inactive", "archived"], default: "active", index: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

BillOfMaterialSchema.index({ companyId: 1, bomNo: 1 }, { unique: true });
BillOfMaterialSchema.index({ companyId: 1, finishedProductId: 1, status: 1 });

module.exports = mongoose.models.BillOfMaterial || mongoose.model("BillOfMaterial", BillOfMaterialSchema);
