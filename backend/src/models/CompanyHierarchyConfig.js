const mongoose = require("mongoose");

const hierarchyLevelSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const CompanyHierarchyConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    hierarchyTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HierarchyTemplate",
      required: true,
    },
    hierarchyCode: { type: String, required: true, trim: true, lowercase: true },
    hierarchyName: { type: String, required: true, trim: true },
    levels: {
      type: [hierarchyLevelSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "Hierarchy levels are required",
      },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyHierarchyConfig", CompanyHierarchyConfigSchema);
