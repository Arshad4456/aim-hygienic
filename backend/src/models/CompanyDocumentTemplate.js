const mongoose = require("mongoose");

const ALLOWED_DOCUMENT_TYPES = ["invoice", "receipt"];

const CompanyDocumentTemplateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ALLOWED_DOCUMENT_TYPES,
      lowercase: true,
      trim: true,
      index: true,
    },
    templateCode: { type: String, required: true, trim: true, lowercase: true },
    templateName: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    layoutVariant: { type: String, trim: true, default: "standard" },
    styleConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    headerConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    footerConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanyDocumentTemplateSchema.index({ companyId: 1, documentType: 1, templateCode: 1 }, { unique: true });

module.exports = mongoose.model("CompanyDocumentTemplate", CompanyDocumentTemplateSchema);
module.exports.ALLOWED_DOCUMENT_TYPES = ALLOWED_DOCUMENT_TYPES;
