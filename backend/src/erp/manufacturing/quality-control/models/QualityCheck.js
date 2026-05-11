const mongoose = require("mongoose");
const { StatusHistorySchema } = require("../../../common/files/models/documentParts");

const QualityCheckSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    documentNo: { type: String, trim: true, required: true },
    productionOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionOrder", index: true },
    productionOrderNo: { type: String, trim: true },
    productId: { type: String, trim: true },
    productName: { type: String, trim: true },
    checkedQty: { type: Number, default: 0 },
    passedQty: { type: Number, default: 0 },
    rejectedQty: { type: Number, default: 0 },
    inspectorId: { type: String, trim: true },
    inspectorName: { type: String, trim: true },
    checkDate: { type: Date, default: Date.now },
    result: { type: String, trim: true, enum: ["pending", "passed", "partial", "failed"], default: "pending", index: true },
    checklist: [{ item: String, value: String, passed: Boolean, notes: String }],
    attachmentUrl: { type: String, trim: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

QualityCheckSchema.index({ companyId: 1, documentNo: 1 }, { unique: true });

module.exports = mongoose.models.QualityCheck || mongoose.model("QualityCheck", QualityCheckSchema);
