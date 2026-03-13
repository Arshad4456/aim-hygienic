const mongoose = require("mongoose");

const ALLOWED_DOCUMENT_TYPES = ["invoice", "receipt"];

const DocumentTemplatePresetSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
      enum: ALLOWED_DOCUMENT_TYPES,
      lowercase: true,
      trim: true,
      index: true,
    },
    templateCode: { type: String, required: true, trim: true, lowercase: true, unique: true },
    templateName: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    layoutVariant: { type: String, trim: true, default: "standard" },
    styleConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    headerConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    footerConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DocumentTemplatePreset", DocumentTemplatePresetSchema);
module.exports.ALLOWED_DOCUMENT_TYPES = ALLOWED_DOCUMENT_TYPES;