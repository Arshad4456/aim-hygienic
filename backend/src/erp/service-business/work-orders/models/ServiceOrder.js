const mongoose = require("mongoose");
const { LineItemSchema, TotalsSchema, StatusHistorySchema } = require("../../../common/files/models/documentParts");
const ServiceOrderSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  orderNo: { type: String, trim: true, required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceTicket" },
  ticketNo: { type: String, trim: true },
  customerId: { type: String, trim: true, index: true },
  customerName: { type: String, trim: true, required: true },
  assetId: { type: String, trim: true },
  assetName: { type: String, trim: true },
  technicianId: { type: String, trim: true, index: true },
  technicianName: { type: String, trim: true },
  serviceType: { type: String, trim: true, default: "repair" },
  scheduledAt: Date,
  completedAt: Date,
  warehouseId: { type: String, trim: true },
  warehouseName: { type: String, trim: true },
  laborAmount: { type: Number, default: 0 },
  lines: { type: [LineItemSchema], default: [] },
  totals: { type: TotalsSchema, default: () => ({}) },
  status: { type: String, enum: ["draft", "scheduled", "in_progress", "completed", "invoiced", "cancelled"], default: "scheduled", index: true },
  statusHistory: { type: [StatusHistorySchema], default: [] },
  proofUrl: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });
ServiceOrderSchema.index({ companyId: 1, orderNo: 1 }, { unique: true });
module.exports = mongoose.models.ServiceOrder || mongoose.model("ServiceOrder", ServiceOrderSchema);
