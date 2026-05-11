const mongoose = require("mongoose");
const LetterOfCreditSchema = new mongoose.Schema({
  companyId: { type: String, trim: true, required: true, index: true },
  lcNo: { type: String, trim: true, required: true },
  bankName: { type: String, trim: true },
  supplierId: { type: String, trim: true }, supplierName: { type: String, trim: true },
  currency: { type: String, trim: true, default: "USD" }, amount: { type: Number, default: 0 }, exchangeRate: { type: Number, default: 1 },
  issueDate: Date, expiryDate: Date,
  status: { type: String, enum: ["draft", "opened", "amended", "settled", "expired", "cancelled"], default: "opened", index: true },
  documentUrl: { type: String, trim: true }, notes: { type: String, trim: true },
}, { timestamps: true });
LetterOfCreditSchema.index({ companyId: 1, lcNo: 1 }, { unique: true });
module.exports = mongoose.models.LetterOfCredit || mongoose.model("LetterOfCredit", LetterOfCreditSchema);
