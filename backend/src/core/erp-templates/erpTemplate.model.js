const mongoose = require("mongoose");
const ErpTemplateSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  modules: { type: [String], default: [] },
  defaultRoles: { type: [String], default: [] },
  mobileRoles: { type: [String], default: [] },
  workflows: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });
module.exports = mongoose.models.ErpTemplate || mongoose.model("ErpTemplate", ErpTemplateSchema);
