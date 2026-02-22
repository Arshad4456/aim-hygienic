const mongoose = require("mongoose");

const LoanPaymentSchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true, index: true },
    paymentDirection: { type: String, enum: ["out", "in"], required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    method: { type: String, enum: ["cash", "bank_transfer", "cheque", "online"], default: "cash" },
    referenceNo: { type: String, trim: true },
    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("LoanPayment", LoanPaymentSchema);
