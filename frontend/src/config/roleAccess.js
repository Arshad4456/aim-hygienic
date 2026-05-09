import {
  ERP_TYPES,
  ERP_MODULE_SETS,
  ROLE_ACCESS_MATRIX,
  normalizeRoleKey,
  normalizeErpType,
  getRolePortalProfile,
  buildAllowedModuleKeys,
  buildSidebarModules,
  getDefaultPathForUser,
  isModuleAllowedForUser,
  isPathAllowedForUser,
  getRoleOptionsForErp,
} from "./erpAccessMatrix";

export {
  ERP_TYPES,
  ERP_MODULE_SETS,
  ROLE_ACCESS_MATRIX,
  normalizeRoleKey,
  normalizeErpType,
  getRolePortalProfile,
  buildAllowedModuleKeys,
  buildSidebarModules,
  getDefaultPathForUser as getSafeRouteForUser,
  getDefaultPathForUser as getDefaultPathForRole,
  isModuleAllowedForUser as isModuleAllowedForRole,
  isPathAllowedForUser as isPathAllowedForRole,
  getRoleOptionsForErp,
};

export function filterModulesForRole(roleOrUser, modules = []) {
  const allowed = new Set(buildAllowedModuleKeys(typeof roleOrUser === "object" ? roleOrUser : { role: roleOrUser }));
  return (modules || []).filter((module) => allowed.has(module.key));
}

export function isSystemPortalRole(roleOrUser = "") {
  return getRolePortalProfile(roleOrUser).scope === "system";
}

export default ROLE_ACCESS_MATRIX;
