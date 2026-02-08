const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    expenseId: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    costCenter: { type: String, trim: true },
    vendorName: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: "BDT" },
    paymentMode: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "mobile_banking", "cheque"],
      default: "cash",
    },
    paymentReference: { type: String, trim: true },
    expenseDate: { type: Date },
    status: { type: String, enum: ["pending", "approved", "rejected", "paid"], default: "pending" },
    requestedBy: { type: String, trim: true },
    approvedBy: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", ExpenseSchema);
