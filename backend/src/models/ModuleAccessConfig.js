const mongoose = require("mongoose");

const ModuleAccessRuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    moduleKey: { type: String, trim: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    allowedRoles: { type: [String], default: [] },
    locked: { type: Boolean, default: false },
  },
  { _id: false }
);

const ModuleAccessConfigSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, unique: true },
    companyName: { type: String, trim: true },
    rules: { type: [ModuleAccessRuleSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModuleAccessConfig", ModuleAccessConfigSchema);
