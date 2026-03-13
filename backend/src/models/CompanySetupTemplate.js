const mongoose = require("mongoose");

const CompanySetupTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "general", lowercase: true },
    sourceCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    templateData: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanySetupTemplate", CompanySetupTemplateSchema);
