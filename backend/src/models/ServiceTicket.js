const mongoose = require("mongoose");
const { StatusHistorySchema } = require("./shared/documentParts");
const ServiceTicketSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  ticketNo: { type: String, trim: true, required: true },
  customerId: { type: String, trim: true, index: true },
  customerName: { type: String, trim: true, required: true },
  assetId: { type: String, trim: true },
  assetName: { type: String, trim: true },
  subject: { type: String, trim: true, required: true },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
  slaHours: { type: Number, default: 24 },
  dueAt: Date,
  assignedToUserId: { type: String, trim: true, index: true },
  assignedToName: { type: String, trim: true },
  status: { type: String, enum: ["open", "assigned", "in_progress", "resolved", "closed", "cancelled"], default: "open", index: true },
  attachmentUrl: { type: String, trim: true },
  statusHistory: { type: [StatusHistorySchema], default: [] },
  notes: { type: String, trim: true },
}, { timestamps: true });
ServiceTicketSchema.index({ companyId: 1, ticketNo: 1 }, { unique: true });
module.exports = mongoose.models.ServiceTicket || mongoose.model("ServiceTicket", ServiceTicketSchema);
