const mongoose = require("mongoose");

const PortalModuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "Core" },
    description: { type: String, trim: true },
    path: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: "LayoutDashboard" },
    order: { type: Number, default: 1000 },
    actions: { type: [String], default: ["view"] },
    webEnabled: { type: Boolean, default: true },
    mobileEnabled: { type: Boolean, default: false },
    allowedErpTemplates: { type: [String], default: ["distribution_erp"] },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PortalModule || mongoose.model("PortalModule", PortalModuleSchema);
