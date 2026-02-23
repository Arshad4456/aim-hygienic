const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    expenseId: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    costCenter: { type: String, trim: true },
    vendorName: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: "PKR" },
    paymentMode: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "mobile_banking", "cheque", "online"],
      default: "cash",
    },
    paymentReference: { type: String, trim: true },
    expenseDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid", "posted"],
      default: "pending",
    },
    requestedBy: { type: String, trim: true },
    approvedBy: { type: String, trim: true },
    notes: { type: String, trim: true },

    section: { type: String, enum: ["personal", "daily", "distributor"], default: "personal", index: true },
    subType: { type: String, trim: true, index: true },
    paymentMethod: { type: String, enum: ["cash", "online", "cheque"], default: "cash" },
    fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", index: true },
    paidTo: { type: String, trim: true },
    description: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    approvedAt: { type: Date },
    approvalRequired: { type: Boolean, default: false },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    territory: { type: String, trim: true },
    spenderUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    spenderName: { type: String, trim: true },
    expenseType: { type: String, trim: true },
    isTransfer: { type: Boolean, default: false },
    transferToAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    linkReference: { type: String, trim: true },
    linkedRefType: { type: String, trim: true },
    linkedRefId: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    accountTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "AccountTransaction" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", ExpenseSchema);
