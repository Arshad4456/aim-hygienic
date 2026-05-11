const mongoose = require("mongoose");
const { LineItemSchema, TotalsSchema, StatusHistorySchema } = require("../../../common/files/models/documentParts");
const TradingShipmentSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  shipmentNo: { type: String, trim: true, required: true },
  shipmentType: { type: String, enum: ["import", "export", "local"], default: "import", index: true },
  supplierId: { type: String, trim: true }, supplierName: { type: String, trim: true },
  customerId: { type: String, trim: true }, customerName: { type: String, trim: true },
  lcId: { type: String, trim: true }, lcNo: { type: String, trim: true },
  containerNo: { type: String, trim: true }, blNo: { type: String, trim: true }, vesselName: { type: String, trim: true },
  originPort: { type: String, trim: true }, destinationPort: { type: String, trim: true }, eta: Date, etd: Date, receivedAt: Date,
  currency: { type: String, trim: true, default: "USD" }, exchangeRate: { type: Number, default: 1 },
  warehouseId: { type: String, trim: true }, warehouseName: { type: String, trim: true },
  lines: { type: [LineItemSchema], default: [] },
  totals: { type: TotalsSchema, default: () => ({}) },
  landedCostTotal: { type: Number, default: 0 },
  landedCostPerUnit: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "booked", "in_transit", "arrived", "received", "closed", "cancelled"], default: "booked", index: true },
  documentUrl: { type: String, trim: true },
  statusHistory: { type: [StatusHistorySchema], default: [] },
  notes: { type: String, trim: true },
}, { timestamps: true });
TradingShipmentSchema.index({ companyId: 1, shipmentNo: 1 }, { unique: true });
module.exports = mongoose.models.TradingShipment || mongoose.model("TradingShipment", TradingShipmentSchema);
