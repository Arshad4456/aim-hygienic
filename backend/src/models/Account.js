const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, trim: true, unique: true },
    accountName: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ["bank", "cash", "card", "mobile", "wallet"],
      default: "bank",
    },
    bankName: { type: String, trim: true },
    branch: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    currency: { type: String, trim: true, default: "BDT" },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    swiftCode: { type: String, trim: true },
    iban: { type: String, trim: true },
    managerName: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", AccountSchema);
