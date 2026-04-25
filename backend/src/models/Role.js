const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema(
  {
    actions: { type: [String], default: ["view"] },
    scope: { type: String, enum: ["all", "company", "branch", "warehouse", "territory", "own"], default: "company" },
  },
  { _id: false }
);

const RoleSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, index: true },
    erpTemplateKey: { type: String, trim: true, default: "distribution_erp", index: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    portalType: { type: String, trim: true, default: "company_user", index: true },
    permissions: { type: Map, of: PermissionSchema, default: {} },
    enabledModules: { type: [String], default: [] },
    landingPath: { type: String, trim: true, default: "/portals" },
    mobileAccess: { type: Boolean, default: false },
    mobileModules: { type: [String], default: [] },
    isSystemRole: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RoleSchema.index({ companyId: 1, key: 1 }, { unique: true });
module.exports = mongoose.models.Role || mongoose.model("Role", RoleSchema);
