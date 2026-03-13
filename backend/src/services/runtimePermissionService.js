const User = require("../models/User");
const CompanyRoleModulePermission = require("../models/CompanyRoleModulePermission");
const Company = require("../models/Company");
const { getCurrentCompanySubscription } = require("./subscriptionLifecycleService");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function isSuperAdminRole(roleValue) {
  const normalized = normalizeCode(roleValue);
  return normalized === "super admin" || normalized === "superadmin";
}

function parseAllowedActions(permissionDoc) {
  return new Set((permissionDoc?.allowedActions || []).map((action) => normalizeCode(action)).filter(Boolean));
}

function parseSectionActions(permissionDoc) {
  const sectionActions = new Map();

  for (const section of permissionDoc?.sectionPermissions || []) {
    const sectionCode = normalizeCode(section?.sectionCode);
    if (!sectionCode) continue;

    sectionActions.set(
      sectionCode,
      new Set((section.allowedActions || []).map((action) => normalizeCode(action)).filter(Boolean))
    );
  }

  return sectionActions;
}

async function resolveUserRuntimePermissionContext(authUser) {
  if (!authUser?.uid) {
    const error = new Error("Authentication context is missing uid");
    error.status = 401;
    throw error;
  }

  const user = await User.findById(authUser.uid).lean();
  if (!user) {
    const error = new Error("Authenticated user not found");
    error.status = 401;
    throw error;
  }

  const roleCode = normalizeCode(user.role);
  const companyId = String(user.companyId || "").trim();

  return {
    roleCode,
    companyId,
    allowAll: Boolean(authUser.isSuperAdmin) || Boolean(user.isSuperAdmin) || isSuperAdminRole(authUser.role) || isSuperAdminRole(user.role),
  };
}

async function hasRuntimePermission(authUser, moduleCode, action, sectionCode) {
  const normalizedModuleCode = normalizeCode(moduleCode);
  const normalizedAction = normalizeCode(action);
  const normalizedSectionCode = normalizeCode(sectionCode);

  if (!normalizedModuleCode || !normalizedAction) {
    return {
      allowed: false,
      reason: "moduleCode and action are required",
    };
  }

  const context = await resolveUserRuntimePermissionContext(authUser);
  if (context.allowAll) {
    return { allowed: true, reason: "super-admin override" };
  }

  if (!context.roleCode || !context.companyId) {
    return { allowed: false, reason: "role or company missing for runtime permission lookup" };
  }

  const company = await Company.findOne({ $or: [{ _id: context.companyId }, { companyId: context.companyId }, { slug: context.companyId }] }).lean();
  if (!company) {
    return { allowed: false, reason: "company not found" };
  }


  const subscription = await getCurrentCompanySubscription(company._id);
  const includedModules = new Set((subscription?.planId?.includedModules || []).map((item) => normalizeCode(item)).filter(Boolean));
  if (!includedModules.has(normalizedModuleCode)) {
    return { allowed: false, reason: "module not included in company plan" };
  }

  const permissionDoc = await CompanyRoleModulePermission.findOne({
    companyId: company._id,
    roleCode: context.roleCode,
    moduleCode: normalizedModuleCode,
    isActive: true,
  }).lean();

  if (!permissionDoc) {
    return { allowed: false, reason: "no runtime permission configuration found" };
  }

  if (normalizedSectionCode) {
    const sectionActions = parseSectionActions(permissionDoc).get(normalizedSectionCode);
    if (!sectionActions) {
      return { allowed: false, reason: "section not configured" };
    }

    return {
      allowed: sectionActions.has(normalizedAction),
      reason: sectionActions.has(normalizedAction) ? "section action allowed" : "section action denied",
    };
  }

  const allowedActions = parseAllowedActions(permissionDoc);
  return {
    allowed: allowedActions.has(normalizedAction),
    reason: allowedActions.has(normalizedAction) ? "module action allowed" : "module action denied",
  };
}

module.exports = {
  hasRuntimePermission,
};
