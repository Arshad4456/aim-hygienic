const mongoose = require("mongoose");

const AccountTransactionSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    type: { type: String, enum: ["cash_in", "cash_out"], required: true },
    amount: { type: Number, required: true, min: 0 },
    transactionDate: { type: Date, required: true, index: true },
    referenceType: {
      type: String,
      enum: [
        "primary_payment",
        "secondary_payment",
        "expense",
        "salary",
        "supplier_payment",
        "manual_entry",
        "other",
        "opening_balance",
        "reversal",
        "received_loan",
        "return_received_loan",
        "given_loan",
        "return_given_loan",
      ],
      default: "manual_entry",
    },
    referenceId: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    attachmentUrl: { type: String, trim: true },
    isSystemGenerated: { type: Boolean, default: false },
    reversedTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "AccountTransaction" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("AccountTransaction", AccountTransactionSchema);