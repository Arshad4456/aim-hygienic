const mongoose = require("mongoose");

const ReturnClaimSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" },
    orderNo: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "resolved"],
      default: "requested",
    },
    quantity: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReturnClaim", ReturnClaimSchema);