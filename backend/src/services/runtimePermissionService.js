const mongoose = require("mongoose");

const User = require("../models/User");
const CompanyRoleModulePermission = require("../models/CompanyRoleModulePermission");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
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
    allowAll: Boolean(authUser.isSuperAdmin),
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

  if (!context.roleCode || !context.companyId || !mongoose.Types.ObjectId.isValid(context.companyId)) {
    return { allowed: false, reason: "role or company missing for runtime permission lookup" };
  }

  const permissionDoc = await CompanyRoleModulePermission.findOne({
    companyId: context.companyId,
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