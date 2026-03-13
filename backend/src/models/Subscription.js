const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    billingCycle: { type: String, enum: ["monthly", "yearly", "trial", "custom"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "trial", "expired", "suspended", "cancelled"], required: true },
    paymentStatus: { type: String, enum: ["paid", "pending", "overdue", "waived"], default: "pending" },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);