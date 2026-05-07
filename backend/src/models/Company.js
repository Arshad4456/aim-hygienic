const mongoose = require("mongoose");
const { APP_BRAND } = require("../config/brand");
const CompanySchema = new mongoose.Schema({
  companyId: { type: String, required: true, trim: true, unique: true }, slug: { type: String, trim: true }, name: { type: String, required: true, trim: true },
  phone1: { type: String, trim: true }, phone2: { type: String, trim: true }, email: { type: String, trim: true, lowercase: true }, mainOfficeAddress: { type: String, trim: true },
  erpTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "ErpTemplate" }, erpTemplateKey: { type: String, trim: true, default: "distribution_erp" }, businessType: { type: String, trim: true, default: "distribution_erp" }, enabledModules: { type: [String], default: [] }, systemName: { type: String, trim: true, default: () => APP_BRAND.name },
  portalTheme: { primary: { type: String, default: "emerald" }, gradient: { type: String, default: "from-emerald-500 via-cyan-500 to-blue-600" }, sidebar: { type: String, default: "dark" } },
  status: { type: String, enum: ["trial", "active", "inactive", "suspended", "expired", "cancelled"], default: "active", index: true },
  systemAdminNotes: { type: String, trim: true },
  activatedAt: { type: Date },
  suspendedAt: { type: Date },
  suspensionReason: { type: String, trim: true },
  subscription: { planKey: { type: String, trim: true, default: "starter" }, status: { type: String, trim: true, default: "active" }, userLimit: { type: Number, default: 25 }, branchLimit: { type: Number, default: 1 }, warehouseLimit: { type: Number, default: 1 }, moduleLimit: { type: Number, default: 10 }, mobileUserLimit: { type: Number, default: 5 }, allowedModules: { type: [String], default: [] }, expiresAt: { type: Date } },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
CompanySchema.index({ status: 1, erpTemplateKey: 1 });
CompanySchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $exists: true, $type: "string", $ne: "" } } });
module.exports = mongoose.models.Company || mongoose.model("Company", CompanySchema);
