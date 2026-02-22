const mongoose = require("mongoose");

const ACCOUNT_TYPES = ["bank", "cash", "easypaisa", "jazzcash", "other"];

const AccountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, trim: true, unique: true },
    accountName: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ACCOUNT_TYPES,
      default: "bank",
    },
    bankName: { type: String, trim: true },
    branchName: { type: String, trim: true },
    branchCode: { type: String, trim: true },
    accountTitle: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    iban: { type: String, trim: true },
    swiftCode: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    openingDate: { type: Date },
    currency: { type: String, trim: true, default: "PKR" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", AccountSchema);