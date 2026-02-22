const mongoose = require("mongoose");

const LoanSchema = new mongoose.Schema(
  {
    loanType: { type: String, enum: ["received", "given"], required: true, index: true },
    partyName: { type: String, required: true, trim: true },
    partyType: { type: String, trim: true },
    phone: { type: String, trim: true },
    cnicNtn: { type: String, trim: true },
    principalAmount: { type: Number, required: true, min: 0 },
    loanDate: { type: Date, required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
    totalReturnedOrReceived: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    sourceAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    paymentMethod: { type: String, enum: ["cash", "bank_transfer", "cheque", "online"], default: "cash" },
    referenceNo: { type: String, trim: true },
    notes: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

module.exports = mongoose.model("Loan", LoanSchema);
