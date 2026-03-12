const mongoose = require("mongoose");

const CompanySettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    appName: { type: String, trim: true, default: "" },
    logoUrl: { type: String, trim: true, default: "" },
    primaryColor: { type: String, trim: true, default: "" },
    invoiceHeader: { type: String, trim: true, default: "" },
    invoiceFooter: { type: String, trim: true, default: "" },
    receiptHeader: { type: String, trim: true, default: "" },
    receiptFooter: { type: String, trim: true, default: "" },
    modules: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanySettings", CompanySettingsSchema);