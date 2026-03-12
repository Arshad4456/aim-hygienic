const mongoose = require("mongoose");

const sectionPermissionSchema = new mongoose.Schema(
  {
    sectionCode: { type: String, required: true, trim: true, lowercase: true },
    allowedActions: { type: [String], default: [] },
  },
  { _id: false }
);

const CompanyRoleModulePermissionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    companyRoleConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyRoleConfig",
      required: true,
      index: true,
    },
    companyDashboardConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDashboardConfig",
      required: true,
      index: true,
    },
    companyRoleModuleConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyRoleModuleConfig",
      required: true,
      unique: true,
      index: true,
    },
    moduleCode: { type: String, required: true, trim: true, lowercase: true },
    roleCode: { type: String, required: true, trim: true, lowercase: true },
    allowedActions: { type: [String], default: [] },
    sectionPermissions: { type: [sectionPermissionSchema], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyRoleModulePermission", CompanyRoleModulePermissionSchema);
